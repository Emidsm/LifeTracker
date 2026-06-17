function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Extrae solo el texto visible para no triggerear en cambios de CSS/tracking pixels
function extractSignificantText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000); // solo primeros 8KB de texto
}

export async function checkMonitors(env, notifyFn) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM url_monitors WHERE active = 1'
  ).all();
  if (!results?.length) return;

  for (const mon of results) {
    try {
      const res = await fetch(mon.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LifeTracker-monitor/1.0)' },
        redirect: 'follow',
        cf: { cacheEverything: false },
      });
      if (!res.ok) continue;

      const html  = await res.text();
      const clean = extractSignificantText(html);
      const hash  = await sha256(clean);
      const now   = new Date().toISOString();

      if (mon.content_hash && mon.content_hash !== hash) {
        const name = mon.opp_name || mon.label;
        await notifyFn(`🔔 Novedades detectadas: ${name} — revisa la página ahora`);
        await env.DB.prepare(
          'UPDATE url_monitors SET content_hash = ?, last_checked_at = ?, last_changed_at = ? WHERE id = ?'
        ).bind(hash, now, now, mon.id).run();
      } else {
        await env.DB.prepare(
          'UPDATE url_monitors SET content_hash = ?, last_checked_at = ? WHERE id = ?'
        ).bind(hash, now, mon.id).run();
      }
    } catch (err) {
      console.error(`Monitor ${mon.id} failed:`, err.message);
    }
  }
}

export async function handleMonitors(request, env, path) {
  const segments = path.split('/');
  const id = segments[1];
  const method = request.method;

  if (method === 'GET' && !id) {
    const { results } = await env.DB.prepare(
      `SELECT m.*, o.name as opp_name
       FROM url_monitors m
       LEFT JOIN opportunities o ON o.id = m.opportunity_id
       ORDER BY m.label ASC`
    ).all();
    return json(results || []);
  }

  if (method === 'POST' && !id) {
    const { url, label, opportunity_id } = await request.json();
    if (!url || !label) return json({ error: 'url y label requeridos' }, 400);
    const newId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO url_monitors (id, url, label, opportunity_id) VALUES (?, ?, ?, ?)'
    ).bind(newId, url, label, opportunity_id || null).run();
    return json({ id: newId }, 201);
  }

  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM url_monitors WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  if (method === 'PUT' && id) {
    const { active, url, label } = await request.json();
    await env.DB.prepare(
      `UPDATE url_monitors SET
        active = COALESCE(?, active),
        url    = COALESCE(?, url),
        label  = COALESCE(?, label)
       WHERE id = ?`
    ).bind(active ?? null, url ?? null, label ?? null, id).run();
    return json({ ok: true });
  }

  // Forzar check inmediato de un monitor específico
  if (method === 'POST' && segments[2] === 'check') {
    const mon = await env.DB.prepare('SELECT * FROM url_monitors WHERE id = ?').bind(id).first();
    if (!mon) return json({ error: 'Not found' }, 404);

    try {
      const res = await fetch(mon.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LifeTracker-monitor/1.0)' },
      });
      const html  = await res.text();
      const clean = extractSignificantText(html);
      const hash  = await sha256(clean);
      const now   = new Date().toISOString();
      const changed = mon.content_hash && mon.content_hash !== hash;

      await env.DB.prepare(
        'UPDATE url_monitors SET content_hash = ?, last_checked_at = ?, last_changed_at = ? WHERE id = ?'
      ).bind(hash, now, changed ? now : mon.last_changed_at, mon.id).run();

      return json({ ok: true, changed, status: res.status });
    } catch (err) {
      return json({ error: err.message }, 502);
    }
  }

  return json({ error: 'Not found' }, 404);
}

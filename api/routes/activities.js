function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

// All date comparisons use -6h offset (Mexico City, UTC-6, no DST since 2023)
// This corrects both old UTC-stored entries and new ones uniformly.
const TZ_OFFSET = '-6 hours';

export async function handleActivities(request, env, path) {
  const segments = path.split('/');
  const id = segments[1];
  const method = request.method;

  if (method === 'GET' && !id) {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    let stmt;
    if (date) {
      stmt = env.DB.prepare(
        `SELECT * FROM activities WHERE date(created_at, '${TZ_OFFSET}') = ? ORDER BY created_at ASC`
      ).bind(date);
    } else if (from && to) {
      stmt = env.DB.prepare(
        `SELECT * FROM activities WHERE date(created_at, '${TZ_OFFSET}') BETWEEN ? AND ? ORDER BY created_at ASC`
      ).bind(from, to);
    } else {
      stmt = env.DB.prepare(
        `SELECT * FROM activities WHERE date(created_at, '${TZ_OFFSET}') = date('now', '${TZ_OFFSET}') ORDER BY created_at ASC`
      );
    }

    const { results } = await stmt.all();
    return json(results || []);
  }

  if (method === 'POST') {
    const { category, note, created_at } = await request.json();
    if (!category) return json({ error: 'category requerido' }, 400);

    const id = crypto.randomUUID();
    const ts = created_at || new Date().toISOString();

    await env.DB.prepare(
      'INSERT INTO activities (id, category, note, created_at) VALUES (?, ?, ?, ?)'
    ).bind(id, category, note || null, ts).run();

    // Don't update last_activity_at for pausa — pausa ends the session, not starts one
    if (category !== 'pausa') {
      await env.DB.prepare('UPDATE settings SET last_activity_at = ? WHERE id = 1').bind(ts).run();
    }

    return json({ id, category, note: note || null, created_at: ts }, 201);
  }

  if (method === 'PUT' && id) {
    const body = await request.json();
    const updates = [];
    const params = [];
    if ('category' in body) { updates.push('category = ?'); params.push(body.category); }
    if ('note' in body)     { updates.push('note = ?');     params.push(body.note ?? null); }
    if ('created_at' in body) { updates.push('created_at = ?'); params.push(body.created_at); }
    if (!updates.length) return json({ error: 'Nada que actualizar' }, 400);
    params.push(id);
    await env.DB.prepare(`UPDATE activities SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params).run();
    return json({ ok: true });
  }

  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM activities WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}

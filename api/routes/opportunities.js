function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

const MOBILITY = 'Movilidad académica';

async function withChecklist(env, results) {
  const mobilityIds = results.filter(o => o.category === MOBILITY).map(o => o.id);
  const map = {};
  for (const oid of mobilityIds) {
    const { results: items } = await env.DB.prepare(
      'SELECT item_key, checked FROM checklist_items WHERE opportunity_id = ?'
    ).bind(oid).all();
    map[oid] = items || [];
  }
  return results.map(o => ({ ...o, checklist: map[o.id] ?? null }));
}

export async function handleOpportunities(request, env, path) {
  const segments = path.split('/');
  const id = segments[1];
  const subaction = segments[2];
  const method = request.method;

  if (method === 'GET' && !id) {
    const url = new URL(request.url);
    const cat = url.searchParams.get('category');
    let stmt;
    if (cat) {
      stmt = env.DB.prepare(
        "SELECT * FROM opportunities WHERE category = ? ORDER BY CASE WHEN deadline IS NULL THEN 1 ELSE 0 END, deadline ASC"
      ).bind(cat);
    } else {
      stmt = env.DB.prepare(
        "SELECT * FROM opportunities ORDER BY CASE WHEN deadline IS NULL THEN 1 ELSE 0 END, deadline ASC"
      );
    }
    const { results } = await stmt.all();
    return json(await withChecklist(env, results || []));
  }

  if (method === 'GET' && id) {
    const opp = await env.DB.prepare('SELECT * FROM opportunities WHERE id = ?').bind(id).first();
    if (!opp) return json({ error: 'Not found' }, 404);
    const enriched = await withChecklist(env, [opp]);
    return json(enriched[0]);
  }

  if (method === 'POST') {
    const { name, category, deadline, status, notes, link } = await request.json();
    if (!name || !category) return json({ error: 'name y category requeridos' }, 400);
    const newId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO opportunities (id, name, category, deadline, status, notes, link) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(newId, name, category, deadline || null, status || 'Por investigar', notes || null, link || null).run();
    return json({ id: newId }, 201);
  }

  if (method === 'PUT' && id && subaction === 'checklist') {
    const { item_key, checked } = await request.json();
    await env.DB.prepare(
      'INSERT INTO checklist_items (opportunity_id, item_key, checked) VALUES (?, ?, ?) ON CONFLICT(opportunity_id, item_key) DO UPDATE SET checked = excluded.checked'
    ).bind(id, item_key, checked ? 1 : 0).run();
    return json({ ok: true });
  }

  if (method === 'PUT' && id) {
    const fields = await request.json();
    const allowed = ['name', 'category', 'deadline', 'status', 'notes', 'link'];
    const sets = [];
    const vals = [];
    for (const f of allowed) {
      if (f in fields) { sets.push(`${f} = ?`); vals.push(fields[f] ?? null); }
    }
    if (!sets.length) return json({ error: 'Nada que actualizar' }, 400);
    sets.push('updated_at = datetime(\'now\')');
    vals.push(id);
    await env.DB.prepare(`UPDATE opportunities SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return json({ ok: true });
  }

  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM opportunities WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}

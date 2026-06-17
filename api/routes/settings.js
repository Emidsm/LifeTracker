function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleSettings(request, env) {
  if (request.method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT freq_minutes, awake_start, awake_end, pause_until FROM settings WHERE id = 1'
    ).first();
    return json(row || {});
  }

  if (request.method === 'PUT') {
    const { freq_minutes, awake_start, awake_end, pause_until } = await request.json();
    await env.DB.prepare(
      `UPDATE settings SET
        freq_minutes = COALESCE(?, freq_minutes),
        awake_start  = COALESCE(?, awake_start),
        awake_end    = COALESCE(?, awake_end),
        pause_until  = ?
       WHERE id = 1`
    ).bind(freq_minutes ?? null, awake_start ?? null, awake_end ?? null, pause_until ?? null).run();
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

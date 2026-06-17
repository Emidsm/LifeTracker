function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function handleAuth(request, env, subpath) {
  if (subpath === 'status' && request.method === 'GET') {
    const row = await env.DB.prepare('SELECT pin_hash FROM settings WHERE id = 1').first();
    return json({ setup_required: !row?.pin_hash });
  }

  if (subpath === 'setup' && request.method === 'POST') {
    const { pin } = await request.json();
    if (!pin || !/^\d{4}$/.test(pin)) return json({ error: 'PIN debe ser 4 dígitos' }, 400);

    const row = await env.DB.prepare('SELECT pin_hash FROM settings WHERE id = 1').first();
    if (row?.pin_hash) return json({ error: 'PIN ya configurado' }, 400);

    await env.DB.prepare('UPDATE settings SET pin_hash = ? WHERE id = 1')
      .bind(await hashPin(pin)).run();
    return json({ ok: true });
  }

  if (subpath === 'login' && request.method === 'POST') {
    const { pin } = await request.json();
    const row = await env.DB.prepare('SELECT pin_hash FROM settings WHERE id = 1').first();

    if (!row?.pin_hash) return json({ setup_required: true });
    if ((await hashPin(pin)) !== row.pin_hash) return json({ error: 'PIN incorrecto' }, 401);

    const token = randomToken();
    const expires = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();
    await env.DB.prepare('INSERT INTO auth_tokens (token, expires_at) VALUES (?, ?)')
      .bind(token, expires).run();

    return json({ token });
  }

  return json({ error: 'Not found' }, 404);
}

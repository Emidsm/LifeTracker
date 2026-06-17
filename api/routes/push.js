import { sendPush } from '../webpush.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

const MESSAGES = [
  '¿Qué estás haciendo ahora?',
  '¿En qué andas?',
  'Registra tu actividad actual',
  '¿Cómo vas? — LifeTracker',
  '¿Qué estás haciendo en este momento?',
  'Hora de anotar — ¿qué va?',
];

export async function handlePush(request, env, path) {
  const action = path.split('/')[1];

  if (action === 'vapid-public-key' && request.method === 'GET') {
    return json({ publicKey: env.VAPID_PUBLIC_KEY || '' });
  }

  if (action === 'subscribe' && request.method === 'POST') {
    const { endpoint, keys } = await request.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) return json({ error: 'Suscripción inválida' }, 400);
    await env.DB.prepare(
      'INSERT INTO push_subscriptions (endpoint, p256dh, auth_key) VALUES (?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth_key = excluded.auth_key'
    ).bind(endpoint, keys.p256dh, keys.auth).run();
    return json({ ok: true });
  }

  if (action === 'subscribe' && request.method === 'DELETE') {
    const { endpoint } = await request.json();
    await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
    return json({ ok: true });
  }

  if (action === 'test' && request.method === 'POST') {
    await notifyAll(env, '👋 Notificación de prueba — LifeTracker funcionando');
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}

export async function notifyAll(env, message) {
  if (!env.VAPID_PRIVATE_KEY_JWK || !env.VAPID_PUBLIC_KEY) return;

  const { results } = await env.DB.prepare(
    'SELECT endpoint, p256dh, auth_key FROM push_subscriptions'
  ).all();
  if (!results?.length) return;

  let privateKeyJwk;
  try { privateKeyJwk = JSON.parse(env.VAPID_PRIVATE_KEY_JWK); }
  catch { console.error('VAPID_PRIVATE_KEY_JWK inválido'); return; }

  await Promise.allSettled(results.map(async sub => {
    try {
      await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({ title: 'LifeTracker', body: message, url: '/registro' }),
        privateKeyJwk, env.VAPID_PUBLIC_KEY, env.VAPID_SUBJECT
      );
    } catch (err) {
      console.error(`Push failed (${sub.endpoint.slice(-20)}):`, err.message);
      if (/40[014]/.test(err.message)) {
        await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(sub.endpoint).run();
      }
    }
  }));
}

export async function sendScheduledNotification(env) {
  const s = await env.DB.prepare(
    'SELECT freq_minutes, awake_start, awake_end, pause_until, last_notified_at, last_activity_at FROM settings WHERE id = 1'
  ).first();
  if (!s) return;

  const now = new Date();
  const nowISO = now.toISOString();

  if (s.pause_until && nowISO < s.pause_until) return;

  // Mexico City = UTC-6 (approx; no DST handling for simplicity)
  const localHour = (now.getUTCHours() - 6 + 24) % 24;
  const localMin  = now.getUTCMinutes();
  const hhmm = `${String(localHour).padStart(2,'0')}:${String(localMin).padStart(2,'0')}`;
  if (hhmm < s.awake_start || hhmm >= s.awake_end) return;

  if (s.last_notified_at) {
    const mins = (now - new Date(s.last_notified_at)) / 60000;
    if (mins < s.freq_minutes) return;
  }

  let message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  if (s.last_activity_at) {
    const hrs = (now - new Date(s.last_activity_at)) / 3600000;
    if (hrs >= 3) message = `Llevas ${Math.floor(hrs)}h sin registrar — ¿qué ha pasado?`;
  }

  await notifyAll(env, message);
  await env.DB.prepare('UPDATE settings SET last_notified_at = ? WHERE id = 1').bind(nowISO).run();
}

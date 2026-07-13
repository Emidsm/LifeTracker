import { sendPush } from '../webpush.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

// Mensajes por contexto. Tono de apoyo, nunca de reproche: la culpa hace
// abandonar la app, no registrar más.
const MSG = {
  morning: [
    '¿Qué quieres que cuente hoy? Elige una cosa.',
    'Buenos días ☀️ ¿Con qué arrancamos?',
    '¿Cuál es tu 1 cosa importante de hoy?',
  ],
  midday: [
    '¿Retomamos algo? Aunque sean 20 min.',
    '¿En qué andas ahora?',
    'Momento de anotar — ¿qué va?',
  ],
  evening: [
    '¿Cerramos el día? ¿Cómo te fue?',
    '¿Nos vamos a dormir pronto? Anota lo último 🌙',
    'Casi hora de descansar. ¿Qué tal el día?',
  ],
  gap: [
    '¿Todo bien por ahí? Sin presión, solo paso a saludar.',
    'Aquí sigo cuando quieras retomar. Sin prisa.',
    '¿Cómo vas? Cuando puedas, me cuentas.',
  ],
  neutral: [
    '¿Qué estás haciendo ahora?',
    '¿En qué andas?',
    '¿Cómo va todo?',
  ],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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

  // Elige el mensaje según el momento del día (usa la ventana despierta).
  const startHour = parseInt(s.awake_start.slice(0, 2), 10) || 8;
  const endHour   = parseInt(s.awake_end.slice(0, 2), 10) || 23;
  let bucket = 'neutral';
  if (localHour < startHour + 2)      bucket = 'morning';
  else if (localHour >= endHour - 2)  bucket = 'evening';
  else                                bucket = 'midday';

  let message = pick(MSG[bucket]);

  // Si lleva mucho sin registrar, tono de apoyo — no de reproche.
  if (s.last_activity_at) {
    const hrs = (now - new Date(s.last_activity_at)) / 3600000;
    if (hrs >= 4) message = pick(MSG.gap);
  }

  await notifyAll(env, message);
  await env.DB.prepare('UPDATE settings SET last_notified_at = ? WHERE id = 1').bind(nowISO).run();
}

// Aviso diario de oportunidades: a lo más 1 al día, en horario diurno.
// Elige UN mensaje por prioridad (menos es más): deadline urgente primero,
// luego recordatorio de proceso de entrevistas activo.
export async function sendOpportunityNudge(env) {
  const s = await env.DB.prepare(
    'SELECT pause_until, last_deadline_notified_at FROM settings WHERE id = 1'
  ).first();
  if (!s) return;

  const now = new Date();
  const nowISO = now.toISOString();
  if (s.pause_until && nowISO < s.pause_until) return;

  const localHour = (now.getUTCHours() - 6 + 24) % 24;
  if (localHour < 9 || localHour >= 22) return; // solo en horario diurno

  const todayLocal = new Date(now.getTime() - 6 * 3600000).toISOString().slice(0, 10);
  if (s.last_deadline_notified_at && s.last_deadline_notified_at.slice(0, 10) === todayLocal) return;

  const TERMINAL = ['Rechazado', 'Descartado', 'Aceptado'];
  const { results } = await env.DB.prepare(
    'SELECT name, deadline, status FROM opportunities'
  ).all();
  const opps = results || [];
  const anchor = new Date(todayLocal + 'T12:00:00');

  let message = null;

  // Prioridad 1: deadline viva más cercana dentro de 7 días.
  const upcoming = opps
    .filter(o => o.deadline && !TERMINAL.includes(o.status))
    .map(o => ({
      name: o.name,
      days: Math.round((new Date(o.deadline.slice(0, 10) + 'T12:00:00') - anchor) / 86400000),
    }))
    .filter(o => o.days >= 0 && o.days <= 7)
    .sort((a, b) => a.days - b.days);

  if (upcoming.length) {
    const o = upcoming[0];
    const when = o.days === 0 ? 'cierra hoy'
      : o.days === 1 ? 'cierra mañana'
      : `cierra en ${o.days} días`;
    message = `📌 ${o.name} ${when}`;
  }

  // Prioridad 2: proceso de entrevistas activo — recordatorio de prep, sin presión.
  if (!message) {
    const inInterview = opps.filter(o => o.status === 'En proceso de entrevistas');
    if (inInterview.length) {
      const o = inInterview[0];
      const extra = inInterview.length > 1 ? ` (y ${inInterview.length - 1} más)` : '';
      message = `🎯 Sigues en proceso con ${o.name}${extra}. ¿Repasamos algo hoy? Sin presión.`;
    }
  }

  if (!message) return;

  await notifyAll(env, message);
  await env.DB.prepare('UPDATE settings SET last_deadline_notified_at = ? WHERE id = 1').bind(nowISO).run();
}

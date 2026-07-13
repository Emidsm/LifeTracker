import { handleAuth } from './routes/auth.js';
import { handleActivities } from './routes/activities.js';
import { handleOpportunities } from './routes/opportunities.js';
import { handleSettings } from './routes/settings.js';
import { handlePush, sendScheduledNotification, sendDeadlineReminder, notifyAll } from './routes/push.js';
import { handleMonitors, checkMonitors } from './routes/monitors.js';

function addCors(res) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  return new Response(res.body, { status: res.status, headers: h });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return false;
  const row = await env.DB.prepare(
    "SELECT 1 FROM auth_tokens WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  return !!row;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return addCors(new Response(null, { status: 204 }));

    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });

    const rest = url.pathname.slice(5); // strip /api/

    // Public routes
    if (rest.startsWith('auth/')) {
      return addCors(await handleAuth(request, env, rest.slice(5)));
    }

    // All other routes require auth
    if (!(await requireAuth(request, env))) {
      return addCors(json({ error: 'No autorizado' }, 401));
    }

    try {
      let res;
      if (rest.startsWith('activities'))    res = await handleActivities(request, env, rest);
      else if (rest.startsWith('opportunities')) res = await handleOpportunities(request, env, rest);
      else if (rest.startsWith('settings')) res = await handleSettings(request, env);
      else if (rest.startsWith('push'))     res = await handlePush(request, env, rest);
      else if (rest.startsWith('monitors')) res = await handleMonitors(request, env, rest.slice(8));
      else res = json({ error: 'Not found' }, 404);
      return addCors(res);
    } catch (err) {
      console.error(err);
      return addCors(json({ error: err.message }, 500));
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      Promise.allSettled([
        sendScheduledNotification(env),
        sendDeadlineReminder(env),
        checkMonitors(env, (msg) => notifyAll(env, msg)),
      ])
    );
  },
};

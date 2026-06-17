const BASE = '/api';

function token() { return localStorage.getItem('lt_token'); }

async function req(method, path, body) {
  const headers = {};
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const e = new Error(err.error || 'Error de red');
    e.status = res.status;
    throw e;
  }
  return res.json();
}

export const api = {
  auth: {
    status:  ()        => req('GET',  '/auth/status'),
    setup:   (pin)     => req('POST', '/auth/setup',  { pin }),
    login:   (pin)     => req('POST', '/auth/login',  { pin }),
  },
  activities: {
    list:   (p = {})   => req('GET',    `/activities${qs(p)}`),
    create: (data)     => req('POST',   '/activities', data),
    update: (id, data) => req('PUT',    `/activities/${id}`, data),
    delete: (id)       => req('DELETE', `/activities/${id}`),
  },
  opportunities: {
    list:            (p = {})            => req('GET',    `/opportunities${qs(p)}`),
    get:             (id)                => req('GET',    `/opportunities/${id}`),
    create:          (data)              => req('POST',   '/opportunities', data),
    update:          (id, data)          => req('PUT',    `/opportunities/${id}`, data),
    delete:          (id)                => req('DELETE', `/opportunities/${id}`),
    updateChecklist: (id, item_key, checked) =>
      req('PUT', `/opportunities/${id}/checklist`, { item_key, checked }),
  },
  settings: {
    get:    ()     => req('GET', '/settings'),
    update: (data) => req('PUT', '/settings', data),
  },
  push: {
    getPublicKey: ()        => req('GET',    '/push/vapid-public-key'),
    subscribe:    (sub)     => req('POST',   '/push/subscribe', sub),
    unsubscribe:  (endpoint)=> req('DELETE', '/push/subscribe', { endpoint }),
    test:         ()        => req('POST',   '/push/test'),
  },
  monitors: {
    list:   ()             => req('GET',    '/monitors/'),
    create: (data)         => req('POST',   '/monitors/', data),
    delete: (id)           => req('DELETE', `/monitors/${id}/`),
    toggle: (id, active)   => req('PUT',    `/monitors/${id}/`, { active }),
    check:  (id)           => req('POST',   `/monitors/${id}/check`),
  },
};

function qs(params) {
  const s = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString();
  return s ? `?${s}` : '';
}

import { useState, useEffect } from 'preact/hooks';
import { PlusCircle, Bell, BellOff, CirclePause } from 'lucide-preact';
import { api } from '../api.js';
import { CAT_BY_ID, STATUS_COLORS } from '../constants.js';

// Fechas de solo día ("YYYY-MM-DD") se parsean a mediodía local para evitar
// el corrimiento de un día por la interpretación UTC.
function parseDate(d) {
  return new Date(String(d).length <= 10 ? d + 'T12:00:00' : d);
}

function deadlineColor(dl) {
  if (!dl) return '#94a3b8';
  const days = (parseDate(dl) - Date.now()) / 86400000;
  if (days < 7)  return '#ef4444';
  if (days < 30) return '#f59e0b';
  return '#10b981';
}

function fmtDate(d) {
  if (!d) return 'Sin fecha';
  return parseDate(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function todayLocalISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function PushButton() {
  const [status, setStatus] = useState('unknown'); // unknown | unsupported | denied | subscribed | unsubscribed
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return;
    }
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription()
    ).then(sub => {
      setStatus(sub ? 'subscribed' : 'unsubscribed');
    }).catch(() => setStatus('unsubscribed'));
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('denied'); setLoading(false); return; }
      const { publicKey } = await api.push.getPublicKey();
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const j = sub.toJSON();
      await api.push.subscribe({ endpoint: j.endpoint, keys: j.keys });
      setStatus('subscribed');
    } catch (e) {
      console.error('Push subscribe error:', e);
    }
    setLoading(false);
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.push.unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus('unsubscribed');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (status === 'unknown' || status === 'unsupported') return null;

  if (status === 'subscribed') {
    return (
      <button class="push-btn push-btn--on" onClick={unsubscribe} disabled={loading} title="Desactivar notificaciones">
        <Bell size={16} strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <button class="push-btn push-btn--off" onClick={subscribe} disabled={loading} title={status === 'denied' ? 'Permiso denegado en el navegador' : 'Activar notificaciones push'}>
      <BellOff size={16} strokeWidth={1.75} />
    </button>
  );
}

export function HomeTab({ onTabChange }) {
  const [opps, setOpps]       = useState([]);
  const [activities, setActs] = useState([]);
  const [pausing, setPausing] = useState(false);

  useEffect(() => {
    api.opportunities.list().then(setOpps).catch(console.error);
    api.activities.list({ date: todayLocalISO() }).then(setActs).catch(console.error);
  }, []);

  // "Próximas fechas límite": solo oportunidades vivas con deadline futura.
  // Excluye estados terminales (rechazado/descartado/aceptado) y fechas ya pasadas,
  // luego ordena por deadline y recorta a 3.
  const TERMINAL_STATUSES = ['Rechazado', 'Descartado', 'Aceptado'];
  const todayISO = todayLocalISO();
  const upcoming = opps
    .filter(o => o.deadline && !TERMINAL_STATUSES.includes(o.status))
    .filter(o => o.deadline.slice(0, 10) >= todayISO)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 3);

  // Procesos activos (ya no aparecen en "Próximas fechas" si su deadline pasó).
  const ACTIVE_STAGES = ['Documentos en proceso', 'Aplicado', 'En proceso de entrevistas'];
  const inProgress = opps.filter(o => ACTIVE_STAGES.includes(o.status)).slice(0, 4);

  const todayActs = activities.slice(-8).reverse();

  // Current running activity = last entry that is NOT pausa
  const lastNonPausa = [...activities].reverse().find(a => a.category !== 'pausa');
  const lastAct = activities[activities.length - 1];
  const isPaused = lastAct?.category === 'pausa';
  const currentCat = !isPaused && lastNonPausa ? CAT_BY_ID[lastNonPausa.category] : null;

  const logPause = async () => {
    if (pausing) return;
    setPausing(true);
    try {
      const act = await api.activities.create({ category: 'pausa', note: null });
      setActs(prev => [...prev, act]);
    } catch (e) { console.error(e); }
    setPausing(false);
  };

  return (
    <div class="home-tab" style={{ position: 'relative' }}>
      <div class="home-header-row">
        <h2 class="tab-heading" style={{ padding: '20px 0 14px', flex: 1 }}>Inicio</h2>
        <PushButton />
      </div>

      {currentCat && (
        <div class="current-activity-bar">
          <div class="current-dot" style={{ background: currentCat.color }} />
          <span class="current-label">
            {currentCat.label}
            {lastNonPausa?.note ? `: ${lastNonPausa.note}` : ''}
            {' · '}
            <span style={{ color: 'var(--fg3)' }}>{fmtTime(lastNonPausa.created_at)}</span>
          </span>
          <button class="current-pause-btn" onClick={logPause} disabled={pausing} title="Detener contador">
            <CirclePause size={16} strokeWidth={1.75} />
            {pausing ? '...' : 'Pausar'}
          </button>
        </div>
      )}

      {isPaused && (
        <div class="current-activity-bar current-activity-bar--paused">
          <span class="current-label">Contador detenido</span>
          <button class="btn btn--ghost" style={{ padding: '4px 12px', fontSize: 12 }}
            onClick={() => onTabChange('registro')}>
            Reanudar
          </button>
        </div>
      )}

      <button class="home-register-btn" onClick={() => onTabChange('registro')}>
        <PlusCircle size={22} strokeWidth={2} />
        Registrar qué estoy haciendo
      </button>

      <p class="home-section-title">Próximas fechas límite</p>
      <div class="home-deadlines">
        {upcoming.length === 0 && (
          <p style={{ color: 'var(--fg3)', fontSize: 13 }}>Sin fechas próximas</p>
        )}
        {upcoming.map(opp => (
          <div
            key={opp.id}
            class="home-deadline-card"
            style={{ '--dl-color': deadlineColor(opp.deadline) }}
            onClick={() => onTabChange('oportunidades')}
          >
            <span class="home-dl-name">{opp.name}</span>
            <span class="home-dl-info">{opp.category} · {fmtDate(opp.deadline)}</span>
          </div>
        ))}
      </div>

      {inProgress.length > 0 && (
        <>
          <p class="home-section-title">En proceso</p>
          <div class="home-deadlines">
            {inProgress.map(opp => (
              <div
                key={opp.id}
                class="home-deadline-card"
                style={{ '--dl-color': STATUS_COLORS[opp.status] || '#8b5cf6' }}
                onClick={() => onTabChange('oportunidades')}
              >
                <span class="home-dl-name">{opp.name}</span>
                <span class="home-dl-info">
                  {opp.status}{opp.deadline ? ` · ${fmtDate(opp.deadline)}` : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <p class="home-section-title">Actividad de hoy</p>
      <div class="home-today">
        {todayActs.length === 0 && (
          <p style={{ color: 'var(--fg3)', fontSize: 13 }}>Nada registrado aún hoy</p>
        )}
        {todayActs.map(a => {
          const cat = CAT_BY_ID[a.category];
          const label = a.category === 'otro' && a.note
            ? `Otro: ${a.note}`
            : a.category === 'pausa'
              ? 'Pausa ⏸'
              : (cat?.label || a.category);
          return (
            <div class="today-activity-row" key={a.id}>
              <div class="today-dot" style={{ background: cat?.color || '#94a3b8' }} />
              <span class="today-label">{label}</span>
              <span class="today-time">{fmtTime(a.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

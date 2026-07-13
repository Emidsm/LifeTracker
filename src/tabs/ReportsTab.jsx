import { useState, useEffect } from 'preact/hooks';
import { ChevronLeft, ChevronRight, Pencil, Trash2, Check, X } from 'lucide-preact';
import { api } from '../api.js';
import { CAT_BY_ID, CATEGORIES } from '../constants.js';

function todayLocalISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function isoDate(d) {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

function fmtDateLabel(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// Local datetime-local value from ISO string (for edit input default)
function isoToLocalInput(iso) {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

// Converts datetime-local input → UTC ISO
function localInputToUTC(val) {
  return new Date(val).toISOString();
}

function actLabel(a) {
  if (a.category === 'pausa') return 'Pausa ⏸';
  if (a.category === 'otro' && a.note) return `Otro: ${a.note}`;
  return CAT_BY_ID[a.category]?.label || a.category;
}

// Key for grouping in Summary — "otro" entries with different notes are separate
function summaryKey(a) {
  if (a.category === 'otro' && a.note) return `otro|${a.note}`;
  return a.category;
}

function toBlocks(activities) {
  if (!activities.length) return [];
  const blocks = [];
  for (let i = 0; i < activities.length; i++) {
    const a = activities[i];
    if (a.category === 'pausa') continue; // pausa marks end of previous block, not a new block

    const startMs = new Date(a.created_at);
    let endMs;
    if (i + 1 < activities.length) {
      // next entry (could be pausa) defines end time
      endMs = new Date(activities[i + 1].created_at);
    } else {
      // last entry: extend to now (max 90min) — but pausa would have been the last entry if stopped
      endMs = new Date(Math.min(Date.now(), startMs.getTime() + 90 * 60000));
    }

    const startMin = startMs.getHours() * 60 + startMs.getMinutes();
    const endMin   = endMs.getHours()   * 60 + endMs.getMinutes();
    blocks.push({
      catId: a.category,
      note:  a.note,
      start: startMin,
      end:   Math.max(endMin, startMin + 5),
    });
  }
  return blocks;
}

function Timeline({ blocks }) {
  const totalMin = 24 * 60;
  const ticks = [0, 4, 8, 12, 16, 20, 24].map(h => ({ h, label: `${h}:00` }));

  return (
    <div>
      <div class="timeline-wrap">
        <div class="timeline">
          <div class="timeline-bg" />
          {blocks.map((b, i) => {
            const cat = CAT_BY_ID[b.catId];
            const left  = (b.start / totalMin) * 100;
            const width = ((b.end - b.start) / totalMin) * 100;
            const tooltip = b.catId === 'otro' && b.note
              ? `Otro: ${b.note}`
              : (cat?.label || b.catId);
            return (
              <div
                key={i}
                class="timeline-block"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 0.5)}%`,
                  background: cat?.color || '#6b7280',
                }}
                title={tooltip}
              />
            );
          })}
        </div>
      </div>
      <div class="timeline-ticks">
        {ticks.map(t => <span key={t.h} class="timeline-tick">{t.label}</span>)}
      </div>
    </div>
  );
}

// Minutos por categoría usando diferencias reales de timestamp.
// Funciona para cualquier rango (día, semana, mes), no solo un día.
function toCategoryTotals(activities) {
  const totals = {};
  const labels = {};
  for (let i = 0; i < activities.length; i++) {
    const a = activities[i];
    if (a.category === 'pausa') continue;
    const start = new Date(a.created_at);
    let end;
    if (i + 1 < activities.length) end = new Date(activities[i + 1].created_at);
    else end = new Date(Math.min(Date.now(), start.getTime() + 90 * 60000));
    let mins = (end - start) / 60000;
    if (mins > 180) mins = 90; // huecos largos (noche / registro siguiente lejano)
    if (mins < 0) mins = 5;
    const key = a.category === 'otro' && a.note ? `otro|${a.note}` : a.category;
    totals[key] = (totals[key] || 0) + mins;
    if (!labels[key]) {
      labels[key] = a.category === 'otro' && a.note
        ? `Otro: ${a.note}`
        : (CAT_BY_ID[a.category]?.label || a.category);
    }
  }
  return { totals, labels };
}

function Summary({ totals, labels }) {
  const sorted = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .filter(([, m]) => m > 0);

  const maxMins = sorted[0]?.[1] || 1;

  if (!sorted.length) {
    return (
      <p style={{ color: 'var(--fg3)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
        Sin registros
      </p>
    );
  }

  return (
    <div class="summary-list">
      {sorted.map(([key, mins]) => {
        const catId = key.startsWith('otro|') ? 'otro' : key;
        const cat = CAT_BY_ID[catId];
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        const label = h ? `${h}h ${m}m` : `${m}m`;
        return (
          <div class="summary-row" key={key}>
            <div class="summary-dot" style={{ background: cat?.color || '#94a3b8' }} />
            <span class="summary-label">{labels[key]}</span>
            <div class="summary-bar-wrap">
              <div class="summary-bar" style={{
                width: `${(mins / maxMins) * 100}%`,
                background: cat?.color || '#94a3b8',
              }} />
            </div>
            <span class="summary-time">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ActivityRow({ act, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({
    created_at: isoToLocalInput(act.created_at),
    category:   act.category,
    note:       act.note || '',
  });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDel]    = useState(false);

  const cat = CAT_BY_ID[act.category];
  const label = actLabel(act);

  const save = async () => {
    setSaving(true);
    try {
      await api.activities.update(act.id, {
        category:   form.category,
        note:       form.note || null,
        created_at: localInputToUTC(form.created_at),
      });
      onUpdated({ ...act, category: form.category, note: form.note || null, created_at: localInputToUTC(form.created_at) });
      setEditing(false);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const del = async () => {
    if (!confirm(`¿Eliminar "${label}"?`)) return;
    setDel(true);
    try {
      await api.activities.delete(act.id);
      onDeleted(act.id);
    } catch (e) { console.error(e); }
    setDel(false);
  };

  if (editing) {
    return (
      <div class="act-edit-row">
        <div class="act-edit-fields">
          <input
            type="datetime-local"
            class="form-input"
            value={form.created_at}
            onInput={e => setForm(f => ({ ...f, created_at: e.target.value }))}
          />
          <select
            class="form-select"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          >
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            <option value="pausa">Pausa ⏸</option>
          </select>
          <input
            class="form-input"
            type="text"
            placeholder="Nota (opcional)"
            value={form.note}
            onInput={e => setForm(f => ({ ...f, note: e.target.value }))}
          />
        </div>
        <div class="act-edit-actions">
          <button class="act-icon-btn act-icon-btn--save" onClick={save} disabled={saving}>
            <Check size={15} />
          </button>
          <button class="act-icon-btn act-icon-btn--cancel" onClick={() => setEditing(false)}>
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="act-row">
      <div class="act-dot" style={{ background: cat?.color || '#94a3b8' }} />
      <span class="act-time">{fmtTime(act.created_at)}</span>
      <span class="act-label">{label}</span>
      <button class="act-icon-btn" onClick={() => setEditing(true)} title="Editar">
        <Pencil size={13} />
      </button>
      <button class="act-icon-btn act-icon-btn--del" onClick={del} disabled={deleting} title="Eliminar">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

const VIEWS = [
  { id: 'day',   label: 'Día' },
  { id: 'week',  label: 'Semana' },
  { id: 'month', label: 'Mes' },
];

// Rango [from, to] (ISO yyyy-mm-dd) para la vista y la fecha ancla.
function rangeFor(view, anchorISO) {
  const d = new Date(anchorISO + 'T12:00:00');
  if (view === 'day') return { from: anchorISO, to: anchorISO };
  if (view === 'week') {
    const dow = (d.getDay() + 6) % 7; // lunes = 0
    const mon = new Date(d); mon.setDate(d.getDate() - dow);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { from: isoDate(mon), to: isoDate(sun) };
  }
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last  = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: isoDate(first), to: isoDate(last) };
}

function shiftAnchor(view, anchorISO, dir) {
  const d = new Date(anchorISO + 'T12:00:00');
  if (view === 'day')   d.setDate(d.getDate() + dir);
  if (view === 'week')  d.setDate(d.getDate() + dir * 7);
  if (view === 'month') d.setMonth(d.getMonth() + dir);
  return isoDate(d);
}

function rangeLabel(view, anchorISO) {
  if (view === 'day') return fmtDateLabel(anchorISO);
  const { from, to } = rangeFor(view, anchorISO);
  if (view === 'month') {
    return new Date(from + 'T12:00:00').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }
  const f = new Date(from + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  const t = new Date(to   + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  return `${f} – ${t}`;
}

export function ReportsTab() {
  const [view, setView]       = useState('day');
  const [anchor, setAnchor]   = useState(todayLocalISO());
  const [activities, setActs] = useState([]);
  const [loading, setLoading] = useState(false);

  const { from, to } = rangeFor(view, anchor);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const p = view === 'day'
      ? api.activities.list({ date: anchor })
      : api.activities.list({ from, to });
    p.then(data => { if (!cancelled) setActs(data); })
     .catch(console.error)
     .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [view, anchor]);

  const prev = () => setAnchor(a => shiftAnchor(view, a, -1));
  const next = () => setAnchor(a => shiftAnchor(view, a, +1));

  const onUpdated = (updated) => setActs(prev => prev.map(a => a.id === updated.id ? updated : a));
  const onDeleted = (id) => setActs(prev => prev.filter(a => a.id !== id));

  const blocks = toBlocks(activities);
  const { totals, labels } = toCategoryTotals(activities);
  const totalMins  = Object.values(totals).reduce((s, m) => s + m, 0);
  const totalH     = Math.floor(totalMins / 60);
  const totalM     = Math.round(totalMins % 60);
  const activeDays = new Set(activities.map(a => a.created_at.slice(0, 10))).size;

  const nextDisabled = to >= todayLocalISO();

  return (
    <div class="reports-tab">
      <h2 class="tab-heading">Reportes</h2>

      <div class="report-view-toggle">
        {VIEWS.map(v => (
          <button
            key={v.id}
            class={`report-view-btn ${view === v.id ? 'active' : ''}`}
            onClick={() => setView(v.id)}
          >{v.label}</button>
        ))}
      </div>

      <div class="date-nav">
        <button onClick={prev}><ChevronLeft size={20} /></button>
        <span>{rangeLabel(view, anchor)}</span>
        <button onClick={next} disabled={nextDisabled}>
          <ChevronRight size={20} />
        </button>
      </div>

      {view === 'day' ? (
        loading
          ? <p style={{ color: 'var(--fg3)', fontSize: 14, textAlign: 'center' }}>Cargando...</p>
          : <Timeline blocks={blocks} />
      ) : (
        <div class="report-range-summary">
          {loading
            ? <p style={{ color: 'var(--fg3)', fontSize: 14, textAlign: 'center' }}>Cargando...</p>
            : <p class="report-range-total">
                {totalH}h {totalM}m registradas · {activeDays} {activeDays === 1 ? 'día' : 'días'} con actividad
              </p>}
        </div>
      )}

      {!loading && <Summary totals={totals} labels={labels} />}

      {view === 'day' && activities.length > 0 && (
        <div class="act-list">
          <p class="act-list-title">Registros del día</p>
          {activities.map(a => (
            <ActivityRow key={a.id} act={a} onUpdated={onUpdated} onDeleted={onDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}

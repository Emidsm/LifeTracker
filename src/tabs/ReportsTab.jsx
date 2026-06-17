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

function Summary({ blocks }) {
  const totals = {};
  const labels = {};
  for (const b of blocks) {
    const key = b.catId === 'otro' && b.note ? `otro|${b.note}` : b.catId;
    totals[key] = (totals[key] || 0) + (b.end - b.start);
    if (!labels[key]) {
      const cat = CAT_BY_ID[b.catId];
      labels[key] = b.catId === 'otro' && b.note
        ? `Otro: ${b.note}`
        : (cat?.label || b.catId);
    }
  }

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
        const m = mins % 60;
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

export function ReportsTab() {
  const [date, setDate]       = useState(todayLocalISO());
  const [activities, setActs] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async (d) => {
    setLoading(true);
    try {
      const data = await api.activities.list({ date: d });
      setActs(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(date); }, [date]);

  const prev = () => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setDate(isoDate(d));
  };
  const next = () => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setDate(isoDate(d));
  };

  const onUpdated = (updated) => setActs(prev => prev.map(a => a.id === updated.id ? updated : a));
  const onDeleted = (id) => setActs(prev => prev.filter(a => a.id !== id));

  const blocks = toBlocks(activities);

  return (
    <div class="reports-tab">
      <h2 class="tab-heading">Reportes</h2>

      <div class="date-nav">
        <button onClick={prev}><ChevronLeft size={20} /></button>
        <span>{fmtDateLabel(date)}</span>
        <button onClick={next} disabled={date >= todayLocalISO()}>
          <ChevronRight size={20} />
        </button>
      </div>

      {loading
        ? <p style={{ color: 'var(--fg3)', fontSize: 14, textAlign: 'center' }}>Cargando...</p>
        : <Timeline blocks={blocks} />
      }

      <Summary blocks={blocks} />

      {activities.length > 0 && (
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

import { useState, useEffect } from 'preact/hooks';
import { Calendar, ExternalLink, Eye, Play, X, Plus } from 'lucide-preact';
import { api } from '../api.js';
import { OPP_CATEGORIES, OPP_STATUSES, STATUS_COLORS, OPP_CAT_COLORS } from '../constants.js';
import { MobilityChecklist } from '../components/MobilityChecklist.jsx';

function deadlineColor(dl) {
  if (!dl) return '#94a3b8';
  const days = (new Date(dl) - Date.now()) / 86400000;
  if (days < 7)  return '#ef4444';
  if (days < 30) return '#f59e0b';
  return '#10b981';
}

function fmtDate(d) {
  if (!d) return 'Sin fecha';
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function OppCard({ opp, onSaved, onDeleted }) {
  const [expanded, setExpanded]   = useState(false);
  const [editing, setEditing]     = useState(false);
  const [form, setForm]           = useState({ ...opp });
  const [checklist, setChecklist] = useState(opp.checklist || []);
  const [saving, setSaving]       = useState(false);

  const isMobility = opp.category === 'Movilidad académica';
  const dlColor    = deadlineColor(opp.deadline);

  const save = async () => {
    setSaving(true);
    try {
      await api.opportunities.update(opp.id, {
        name: form.name, category: form.category, deadline: form.deadline || null,
        status: form.status, notes: form.notes, link: form.link,
      });
      onSaved({ ...opp, ...form });
      setEditing(false);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const del = async () => {
    if (!confirm(`¿Eliminar "${opp.name}"?`)) return;
    await api.opportunities.delete(opp.id);
    onDeleted(opp.id);
  };

  const onChecklistUpdate = (key, checked) => {
    setChecklist(prev => {
      const existing = prev.find(i => i.item_key === key);
      if (existing) return prev.map(i => i.item_key === key ? { ...i, checked } : i);
      return [...prev, { item_key: key, checked }];
    });
  };

  const catColor    = OPP_CAT_COLORS[opp.category] || '#94a3b8';
  const statusColor = STATUS_COLORS[opp.status] || '#94a3b8';

  return (
    <div class="opp-card" style={{ '--deadline-color': dlColor }}>
      <div class="opp-card-header" onClick={() => setExpanded(e => !e)}>
        <div class="opp-card-top">
          <span class="opp-name">{opp.name}</span>
          <div class="opp-badges">
            <span class="badge" style={{ '--badge-bg': catColor + '22', '--badge-color': catColor }}>
              {opp.category}
            </span>
            <span class="badge" style={{ '--badge-bg': statusColor + '22', '--badge-color': statusColor }}>
              {opp.status}
            </span>
          </div>
        </div>
        <p class="opp-deadline">
          <Calendar size={12} strokeWidth={1.75} />
          {fmtDate(opp.deadline)}
        </p>
        {opp.notes && <p class="opp-notes">{opp.notes}</p>}
      </div>

      {expanded && (
        <>
          {isMobility && (
            <MobilityChecklist
              oppId={opp.id}
              items={checklist}
              onUpdate={onChecklistUpdate}
            />
          )}

          {editing ? (
            <div class="opp-edit-form">
              <div class="form-row">
                <label>Nombre</label>
                <input class="form-input" value={form.name}
                  onInput={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div class="form-row">
                <label>Categoría</label>
                <select class="form-select" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {OPP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div class="form-row">
                <label>Fecha límite</label>
                <input class="form-input" type="date" value={form.deadline || ''}
                  onInput={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
              <div class="form-row">
                <label>Estado</label>
                <select class="form-select" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {OPP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div class="form-row">
                <label>Notas</label>
                <textarea class="form-textarea" value={form.notes || ''}
                  onInput={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div class="form-row">
                <label>Link</label>
                <input class="form-input" type="url" value={form.link || ''}
                  onInput={e => setForm(f => ({ ...f, link: e.target.value }))} />
              </div>
              <div class="opp-save-row">
                <button class="btn btn--ghost" onClick={() => setEditing(false)}>Cancelar</button>
                <button class="btn btn--primary" onClick={save} disabled={saving}>
                  {saving ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
              {opp.link && (
                <a href={opp.link} target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ExternalLink size={13} />
                  Link
                </a>
              )}
              <div style={{ flex: 1 }} />
              <button class="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 13 }}
                onClick={() => setEditing(true)}>Editar</button>
              <button class="btn" style={{ padding: '6px 12px', fontSize: 13, background: '#fee2e2', color: '#ef4444', border: 'none' }}
                onClick={del}>Eliminar</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AddOppModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', category: 'Quant-HFT', deadline: '', status: 'Por investigar', notes: '', link: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { id } = await api.opportunities.create({ ...form, deadline: form.deadline || null });
      onCreated({ id, ...form, checklist: null });
      onClose();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div class="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div class="modal add-opp-modal">
        <h3>Nueva oportunidad</h3>
        <div class="form-row"><label>Nombre *</label>
          <input class="form-input" value={form.name} onInput={f('name')} placeholder="Nombre" autoFocus />
        </div>
        <div class="form-row"><label>Categoría</label>
          <select class="form-select" value={form.category} onChange={f('category')}>
            {OPP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div class="form-row"><label>Fecha límite</label>
          <input class="form-input" type="date" value={form.deadline} onInput={f('deadline')} />
        </div>
        <div class="form-row"><label>Estado</label>
          <select class="form-select" value={form.status} onChange={f('status')}>
            {OPP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div class="form-row"><label>Notas</label>
          <textarea class="form-textarea" value={form.notes} onInput={f('notes')} />
        </div>
        <div class="form-row"><label>Link</label>
          <input class="form-input" type="url" value={form.link} onInput={f('link')} />
        </div>
        <div class="actions">
          <button class="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button class="btn btn--primary" onClick={submit} disabled={saving || !form.name.trim()}>
            {saving ? '...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtAgo(iso) {
  if (!iso) return 'nunca';
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 60)   return `hace ${mins}m`;
  if (mins < 1440) return `hace ${Math.round(mins/60)}h`;
  return `hace ${Math.round(mins/1440)}d`;
}

function MonitorPanel() {
  const [open, setOpen]         = useState(false);
  const [monitors, setMonitors] = useState([]);
  const [checking, setChecking] = useState(null);
  const [addUrl, setAddUrl]     = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [adding, setAdding]     = useState(false);

  const load = () =>
    api.monitors.list().then(setMonitors).catch(console.error);

  useEffect(() => { if (open) load(); }, [open]);

  const check = async (id) => {
    setChecking(id);
    try {
      const r = await api.monitors.check(id);
      if (r.changed) alert('El contenido cambió — revisa la página');
      else alert('Sin cambios detectados');
      load();
    } catch (e) { alert('Error: ' + e.message); }
    setChecking(null);
  };

  const del = async (id) => {
    await api.monitors.delete(id);
    load();
  };

  const add = async () => {
    if (!addUrl.trim() || !addLabel.trim()) return;
    setAdding(true);
    try {
      await api.monitors.create({ url: addUrl.trim(), label: addLabel.trim() });
      setAddUrl(''); setAddLabel('');
      load();
    } catch(e) { console.error(e); }
    setAdding(false);
  };

  const statusDot = (m) => {
    if (!m.last_changed_at) return { color: '#94a3b8', title: 'Sin cambios detectados aún' };
    const hrs = (Date.now() - new Date(m.last_changed_at)) / 3600000;
    if (hrs < 24) return { color: '#ef4444', title: 'Cambio reciente' };
    return { color: '#f59e0b', title: 'Cambió hace más de 24h' };
  };

  return (
    <div style={{ margin: '16px 12px 80px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '12px 16px', background: 'var(--bg2)',
          border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
          color: 'var(--fg)', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'var(--font-body)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Eye size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
          Monitores de páginas ({monitors.length || '?'})
        </span>
        <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 12, color: 'var(--fg3)', padding: '0 4px' }}>
            El cron revisa estas páginas cada 15 min y te notifica si cambia el contenido.
          </p>

          {monitors.map(m => {
            const dot = statusDot(m);
            return (
              <div key={m.id} style={{
                background: 'var(--bg2)', borderRadius: 'var(--radius-sm)',
                padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4,
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--card-shadow)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: dot.color, flexShrink: 0 }} title={dot.title} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{m.label}</span>
                  <button
                    onClick={() => check(m.id)}
                    disabled={checking === m.id}
                    style={{
                      fontSize: 11, padding: '3px 8px', background: 'var(--bg3)', border: 'none',
                      borderRadius: 4, cursor: 'pointer', color: 'var(--fg2)',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}
                  >
                    <Play size={10} />
                    {checking === m.id ? '...' : 'Check'}
                  </button>
                  <button
                    onClick={() => del(m.id)}
                    style={{
                      fontSize: 11, padding: '4px', background: '#fee2e2', border: 'none',
                      borderRadius: 4, cursor: 'pointer', color: '#ef4444',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg3)', paddingLeft: 17 }}>
                  <span>Revisado {fmtAgo(m.last_checked_at)}</span>
                  {m.last_changed_at && <span> · Cambió {fmtAgo(m.last_changed_at)}</span>}
                </div>
                <a href={m.url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: 'var(--accent)', paddingLeft: 17,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.url}
                </a>
              </div>
            );
          })}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <input class="form-input" placeholder="Etiqueta (ej: Optiver — internships)"
              value={addLabel} onInput={e => setAddLabel(e.target.value)} />
            <input class="form-input" type="url" placeholder="https://..."
              value={addUrl} onInput={e => setAddUrl(e.target.value)} />
            <button class="btn btn--primary" onClick={add} disabled={adding || !addUrl || !addLabel}>
              {adding ? '...' : '+ Agregar monitor'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function OpportunitiesTab() {
  const [opps, setOpps]       = useState([]);
  const [filter, setFilter]   = useState('Todos');
  const [search, setSearch]   = useState('');
  const [adding, setAdding]   = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.opportunities.list();
      setOpps(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = opps
    .filter(o => filter === 'Todos' || o.category === filter)
    .filter(o => !search || o.name.toLowerCase().includes(search.toLowerCase()));

  const onSaved   = (updated) => setOpps(prev => prev.map(o => o.id === updated.id ? updated : o));
  const onDeleted = (id)      => setOpps(prev => prev.filter(o => o.id !== id));
  const onCreated = (opp)     => setOpps(prev => [...prev, opp]);

  return (
    <div class="opp-tab">
      <h2 class="tab-heading">Oportunidades</h2>

      <input
        class="search-bar"
        placeholder="Buscar..."
        value={search}
        onInput={e => setSearch(e.target.value)}
      />

      <div class="opp-filters">
        {['Todos', ...OPP_CATEGORIES].map(cat => (
          <button
            key={cat}
            class={`filter-chip ${filter === cat ? 'active' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div class="opp-list">
        {loading && <p style={{ color: 'var(--fg3)', fontSize: 14, textAlign: 'center' }}>Cargando...</p>}
        {!loading && visible.length === 0 && (
          <p style={{ color: 'var(--fg3)', fontSize: 14, textAlign: 'center' }}>Sin resultados</p>
        )}
        {visible.map(opp => (
          <OppCard key={opp.id} opp={opp} onSaved={onSaved} onDeleted={onDeleted} />
        ))}
      </div>

      <MonitorPanel />

      <button class="fab" onClick={() => setAdding(true)} title="Agregar oportunidad">
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {adding && <AddOppModal onClose={() => setAdding(false)} onCreated={onCreated} />}
    </div>
  );
}

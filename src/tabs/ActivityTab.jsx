import { useState } from 'preact/hooks';
import {
  Briefcase, Code2, Rocket, FolderOpen, Video, Activity, BookOpen,
  Globe, Trash2, Coffee, Heart, Users, Leaf, Smartphone, Film, Moon, Pencil,
  Clock, CirclePause, Laptop,
} from 'lucide-preact';
import { CATEGORIES } from '../constants.js';
import { api } from '../api.js';

const CAT_ICONS = {
  trabajo_video:   Briefcase,
  trabajo_dev:     Laptop,
  icpc:            Code2,
  saas:            Rocket,
  portafolio:      FolderOpen,
  contenido:       Video,
  ejercicio:       Activity,
  lectura:         BookOpen,
  ingles:          Globe,
  quehacer:        Trash2,
  comida:          Coffee,
  pareja:          Heart,
  social:          Users,
  descanso_activo: Leaf,
  scroll:          Smartphone,
  serie:           Film,
  sueno:           Moon,
  otro:            Pencil,
};

function CatIcon({ id, color }) {
  const Icon = CAT_ICONS[id] || Pencil;
  return (
    <span class="cat-icon" style={{ color }}>
      <Icon size={24} strokeWidth={1.75} />
    </span>
  );
}

// Converts a datetime-local input value ("YYYY-MM-DDTHH:MM") to UTC ISO string
function localInputToUTC(localValue) {
  return new Date(localValue).toISOString();
}

// Returns "YYYY-MM-DDTHH:MM" for the current local time (for datetime-local input default)
function nowLocalInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export function ActivityTab() {
  const [saving, setSaving]         = useState(null);
  const [saved, setSaved]           = useState(null);
  const [showOther, setShowOther]   = useState(false);
  const [note, setNote]             = useState('');
  const [showTimePicker, setShowTP] = useState(false);
  const [customTime, setCustomTime] = useState('');

  const log = async (catId, extraNote = '') => {
    if (saving) return;
    setSaving(catId);
    try {
      const created_at = customTime ? localInputToUTC(customTime) : undefined;
      await api.activities.create({ category: catId, note: extraNote || null, created_at });
      setSaved(catId);
      setCustomTime('');
      setShowTP(false);
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      console.error(e);
    }
    setSaving(null);
  };

  const tap = (cat) => {
    if (cat.id === 'otro') { setShowOther(true); return; }
    log(cat.id);
  };

  const confirmOther = () => {
    log('otro', note);
    setNote('');
    setShowOther(false);
  };

  const logPause = () => log('pausa');

  const savedCat = saved ? CATEGORIES.find(c => c.id === saved) : null;

  const toggleTimePicker = () => {
    if (!showTimePicker) setCustomTime(nowLocalInput());
    else setCustomTime('');
    setShowTP(v => !v);
  };

  return (
    <div class="activity-tab">
      <div class="activity-tab-header">
        <h2 class="tab-heading" style={{ padding: '20px 16px 14px', flex: 1 }}>¿Qué estás haciendo?</h2>
        <button
          class={`time-picker-btn ${showTimePicker ? 'active' : ''}`}
          onClick={toggleTimePicker}
          title="Registrar con hora distinta"
        >
          <Clock size={18} strokeWidth={1.75} />
        </button>
      </div>

      {showTimePicker && (
        <div class="custom-time-bar">
          <span class="custom-time-label">Registrar a las:</span>
          <input
            type="datetime-local"
            class="custom-time-input"
            value={customTime}
            onInput={e => setCustomTime(e.target.value)}
          />
          <button class="custom-time-clear" onClick={() => { setCustomTime(''); setShowTP(false); }}>✕</button>
        </div>
      )}

      {savedCat && (
        <div class="saved-banner">
          <CatIcon id={savedCat.id} color="#fff" />
          {savedCat.label} — registrado
        </div>
      )}

      <div class="category-grid">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            class={`cat-btn ${saving === cat.id ? 'cat-btn--saving' : ''} ${saved === cat.id ? 'cat-btn--saved' : ''}`}
            style={{ '--cat-color': cat.color }}
            onClick={() => tap(cat)}
            disabled={!!saving}
          >
            <CatIcon id={cat.id} color={cat.color} />
            <span class="cat-label">{cat.label}</span>
            {cat.sub && <span class="cat-sub">{cat.sub}</span>}
          </button>
        ))}
      </div>

      <button class="pause-btn" onClick={logPause} disabled={!!saving}>
        <CirclePause size={18} strokeWidth={1.75} />
        Detener contador
      </button>

      {showOther && (
        <div class="other-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowOther(false)}>
          <div class="other-modal">
            <h3>Otro</h3>
            <input
              type="text"
              placeholder="¿Qué estás haciendo? (ej: ferretería, trámites)"
              value={note}
              onInput={e => setNote(e.target.value)}
              autoFocus
            />
            <div class="row">
              <button class="btn btn--ghost" onClick={() => { log('otro'); setShowOther(false); }}>
                Sin nota
              </button>
              <button class="btn btn--primary" onClick={confirmOther} disabled={!note.trim()}>
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

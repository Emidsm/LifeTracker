import { useState } from 'preact/hooks';
import { MOBILITY_CHECKLIST } from '../constants.js';
import { api } from '../api.js';

export function MobilityChecklist({ oppId, items, onUpdate }) {
  const [busy, setBusy] = useState(null);

  const checked = items.filter(i => i.checked).length;
  const total   = MOBILITY_CHECKLIST.length;
  const pct     = total ? Math.round((checked / total) * 100) : 0;

  const isChecked = (key) => items.find(i => i.item_key === key)?.checked;

  const toggle = async (key) => {
    if (busy) return;
    setBusy(key);
    const next = !isChecked(key);
    try {
      await api.opportunities.updateChecklist(oppId, key, next);
      onUpdate(key, next);
    } catch (e) {
      console.error(e);
    }
    setBusy(null);
  };

  return (
    <div class="checklist">
      <p class="checklist-title">{checked}/{total} documentos — {pct}%</p>
      <div class="checklist-progress">
        <div class="checklist-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div class="checklist-items">
        {MOBILITY_CHECKLIST.map(({ key, label }) => {
          const on = !!isChecked(key);
          return (
            <label class={`checklist-item ${on ? 'checked' : ''}`} key={key}>
              <input
                type="checkbox"
                checked={on}
                disabled={busy === key}
                onChange={() => toggle(key)}
              />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

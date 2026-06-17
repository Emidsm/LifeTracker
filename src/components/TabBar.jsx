import { Home, PlusCircle, Target, BarChart2 } from 'lucide-preact';

const TABS = [
  { id: 'home',          Icon: Home,       label: 'Inicio' },
  { id: 'registro',      Icon: PlusCircle, label: 'Registrar' },
  { id: 'oportunidades', Icon: Target,     label: 'Oportunidades' },
  { id: 'reportes',      Icon: BarChart2,  label: 'Reportes' },
];

export function TabBar({ active, onTab }) {
  return (
    <nav class="tab-bar">
      {TABS.map(t => (
        <button
          key={t.id}
          class={`tab-btn ${active === t.id ? 'active' : ''}`}
          onClick={() => onTab(t.id)}
        >
          <t.Icon size={22} strokeWidth={active === t.id ? 2 : 1.75} />
          <span class="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

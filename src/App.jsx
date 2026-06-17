import { useState, useEffect } from 'preact/hooks';
import { api } from './api.js';
import { PinLogin } from './components/PinLogin.jsx';
import { TabBar } from './components/TabBar.jsx';
import { HomeTab } from './tabs/HomeTab.jsx';
import { ActivityTab } from './tabs/ActivityTab.jsx';
import { OpportunitiesTab } from './tabs/OpportunitiesTab.jsx';
import { ReportsTab } from './tabs/ReportsTab.jsx';

const TABS = {
  home:          HomeTab,
  registro:      ActivityTab,
  oportunidades: OpportunitiesTab,
  reportes:      ReportsTab,
};

export function App() {
  const [tab, setTab]     = useState('home');
  const [auth, setAuth]   = useState(() => !!localStorage.getItem('lt_token'));
  const [setup, setSetup] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.auth.status()
      .then(({ setup_required }) => { setSetup(setup_required); setReady(true); })
      .catch(() => setReady(true));
  }, []);

  const onLogin = (token) => {
    localStorage.setItem('lt_token', token);
    setAuth(true);
  };

  if (!ready) return <div class="splash">·</div>;
  if (!auth || setup) return <PinLogin setup={setup} onLogin={onLogin} />;

  const Active = TABS[tab] || HomeTab;

  return (
    <div class="app">
      <main class="tab-content">
        <Active onTabChange={setTab} />
      </main>
      <TabBar active={tab} onTab={setTab} />
    </div>
  );
}

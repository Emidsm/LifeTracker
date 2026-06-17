import { useState, useEffect } from 'preact/hooks';
import { api } from '../api.js';

export function PinLogin({ setup, onLogin }) {
  const [pin, setPin]     = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  const submit = async (p) => {
    setBusy(true);
    setError('');
    try {
      if (setup) await api.auth.setup(p);
      const { token } = await api.auth.login(p);
      onLogin(token);
    } catch (e) {
      setError(e.message || 'Error');
      setPin('');
    }
    setBusy(false);
  };

  useEffect(() => {
    if (pin.length === 4) submit(pin);
  }, [pin]);

  const press = (d) => {
    if (busy || pin.length >= 4) return;
    setPin(p => p + d);
  };

  const del = () => setPin(p => p.slice(0, -1));

  const keys = [1,2,3,4,5,6,7,8,9,null,0,'⌫'];

  return (
    <div class="pin-screen">
      <h1 class="pin-title">LifeTracker</h1>
      <p class="pin-subtitle">
        {setup ? 'Crea tu PIN de 4 dígitos' : 'Ingresa tu PIN'}
      </p>

      <div class="pin-dots">
        {[0,1,2,3].map(i => (
          <div class={`pin-dot ${pin.length > i ? 'filled' : ''}`} key={i} />
        ))}
      </div>

      {error && <p class="pin-error">{error}</p>}

      <div class="pin-pad">
        {keys.map((k, i) =>
          k === null ? <div key={i} /> :
          k === '⌫'
            ? <button class="pin-key pin-key--del" key={i} onClick={del}>{k}</button>
            : <button class="pin-key" key={i} onClick={() => press(String(k))} disabled={busy}>{k}</button>
        )}
      </div>
    </div>
  );
}

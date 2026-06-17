import { render } from 'preact';
import { App } from './App.jsx';
import './styles/global.css';

render(<App />, document.getElementById('app'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}

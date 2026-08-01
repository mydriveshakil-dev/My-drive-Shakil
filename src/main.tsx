import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handlers to catch and gracefully absorb transient IndexedDB connection closing errors in iframe/reload
window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = String(event.reason?.message || event.reason || '');
  if (
    reasonStr.includes('IDBDatabase') ||
    reasonStr.includes('database connection is closing') ||
    reasonStr.includes('transaction') ||
    event.reason?.name === 'InvalidStateError'
  ) {
    console.warn('Handled transient IndexedDB connection closing error:', event.reason);
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = String(event.message || '');
  if (
    msg.includes('IDBDatabase') ||
    msg.includes('database connection is closing') ||
    msg.includes('transaction')
  ) {
    console.warn('Handled transient IndexedDB error:', event.message);
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

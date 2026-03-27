'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [status, setStatus] = useState('Checking connection...');

  const connectGithub = () => {
    window.location.href = 'http://localhost:3000/auth/github';
  };

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(
          'http://localhost:3000/auth/github/status',
          { credentials: 'include' }
        );

        const data = await res.json();

        if (data.connected) {
          setStatus(`Connected as ${data.username}`);
        } else {
          setStatus('Not connected');
        }
      } catch {
        setStatus('Error checking status');
      }
    }

    checkStatus();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Settings</h1>

      <h2>Integrations</h2>

      <h3>GitHub</h3>

      <p>{status}</p>

      <button onClick={connectGithub}>
        Connect GitHub
      </button>
    </div>
  );
}
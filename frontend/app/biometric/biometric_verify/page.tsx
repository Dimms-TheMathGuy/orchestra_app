'use client';

import { startAuthentication } from '@simplewebauthn/browser';

export default function VerifyBiometricButton() {
  const projectId = 'test-project';

  const handleVerify = async () => {
    const userId = localStorage.getItem('userId');

    if (!userId) {
      alert('User ID tidak ditemukan. Login dulu.');
      return;
    }

    const optionsRes = await fetch('http://localhost:3000/passkey/auth/options', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    const optionsJSON = await optionsRes.json();

    if (optionsJSON.error) {
      alert(optionsJSON.error);
      return;
    }

    const authResponse = await startAuthentication(optionsJSON);

    const verifyRes = await fetch('http://localhost:3000/passkey/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        response: authResponse,
      }),
    });

    const result = await verifyRes.json();

    if (result.verified) {
      window.location.href = `/projects/${projectId}`;
    } else {
      alert(result.error || 'Biometric failed');
    }
  };

  return (
    <main style={{ padding: '40px' }}>
      <h1>Verify with Biometric</h1>

      <button
        onClick={handleVerify}
        style={{
          padding: '12px 20px',
          backgroundColor: 'black',
          color: 'white',
          borderRadius: '8px',
          marginTop: '20px',
        }}
      >
        Verify with Biometric
      </button>
    </main>
  );
}
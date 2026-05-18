'use client';

import { startAuthentication } from '@simplewebauthn/browser';

export default function VerifyBiometricButton() {
  const projectId = "test-project";

  const handleVerify = async () => {
    const optionsRes = await fetch('http://localhost:3000/passkey/auth/options', {
      method: 'POST',
      credentials: 'include',
    });

    const optionsJSON = await optionsRes.json();

    const authResponse = await startAuthentication(optionsJSON);

    const verifyRes = await fetch('http://localhost:3000/passkey/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(authResponse),
    });

    const result = await verifyRes.json();

    if (result.verified) {
      window.location.href = `/projects/${projectId}`;
    } else {
      alert('Biometric failed');
    }
  };

  return (
    <main style={{ padding: "40px" }}>
      <h1>Verify with Biometric</h1>

      <button
        onClick={handleVerify}
        style={{
          padding: "12px 20px",
          backgroundColor: "black",
          color: "white",
          borderRadius: "8px",
          marginTop: "20px",
        }}
      >
        Verify with Biometric
      </button>
    </main>
  );
}
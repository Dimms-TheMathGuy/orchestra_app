'use client';

import { startRegistration } from '@simplewebauthn/browser';

export default function RegisterBiometricButton() {
  const handleRegister = async () => {
    const optionsRes = await fetch('http://localhost:3000/passkey/register/options', {
      method: 'POST',
      credentials: 'include',
    });

    const optionsJSON = await optionsRes.json();

    const registrationResponse = await startRegistration(optionsJSON);

    const verifyRes = await fetch('http://localhost:3000/passkey/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(registrationResponse),
    });

    const result = await verifyRes.json();

    if (result.verified) {
      alert('Biometric registered!');
    }
  };

  return (
    <main style={{ padding: "40px" }}>
      <h1>Register Biometric</h1>

      <button
        onClick={handleRegister}
        style={{
          padding: "12px 20px",
          backgroundColor: "black",
          color: "white",
          borderRadius: "8px",
          marginTop: "20px",
        }}
      >
        Register Biometric
      </button>
    </main>
  );

}
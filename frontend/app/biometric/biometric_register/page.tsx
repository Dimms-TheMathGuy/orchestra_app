'use client';

import { useRouter } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';

export default function RegisterBiometricButton() {
  const router = useRouter();

  const handleRegister = async () => {
    const userId = localStorage.getItem('userId');

    if (!userId) {
      alert('User ID tidak ditemukan. Login dulu.');
      return;
    }

    const optionsRes = await fetch('http://localhost:3000/passkey/register/options', {
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

    const registrationResponse = await startRegistration(optionsJSON);

    const verifyRes = await fetch('http://localhost:3000/passkey/register/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        response: registrationResponse,
      }),
    });

    const result = await verifyRes.json();

    if (result.verified) {
      alert('Biometric registered!');
      router.push('/dashboard');
    } else {
      alert(result.error || 'Failed to register biometric');
    }
  };

  return (
    <main style={{ padding: '40px' }}>
      <h1>Register Biometric</h1>

      <button
        onClick={handleRegister}
        style={{
          padding: '12px 20px',
          backgroundColor: 'black',
          color: 'white',
          borderRadius: '8px',
          marginTop: '20px',
        }}
      >
        Register Biometric
      </button>
    </main>
  );
}
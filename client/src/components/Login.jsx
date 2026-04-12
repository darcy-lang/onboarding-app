import { useState } from 'react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password.trim()) return setError('Enter your username and password.');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return; }
      onLogin(data.user);
    } catch { setError('Connection error. Try again.'); setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#09080A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🏡</div>
        <div style={{ fontSize: 11, letterSpacing: '0.35em', color: '#D4A853', textTransform: 'uppercase', marginBottom: 10 }}>Costa Blanca Real Estate</div>
        <h1 style={{ fontSize: 26, color: '#EEE5D5', fontWeight: 800, marginBottom: 8 }}>90-Day Onboarding</h1>
        <p style={{ fontSize: 14, color: '#4A4050', marginBottom: 36, lineHeight: 1.6 }}>Sign in to access your programme.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Username"
            autoCapitalize="none"
            style={{ background: '#100F14', border: '1px solid #2A2430', borderRadius: 12, padding: '14px 18px', fontSize: 16, color: '#EEE5D5', outline: 'none', textAlign: 'left' }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Password"
            style={{ background: '#100F14', border: '1px solid #2A2430', borderRadius: 12, padding: '14px 18px', fontSize: 16, color: '#EEE5D5', outline: 'none' }}
          />
        </div>

        {error && <div style={{ background: '#1A0A0A', border: '1px solid #5A2020', borderRadius: 10, padding: '10px 14px', color: '#E07B6A', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <button
          onClick={submit}
          disabled={loading}
          style={{ width: '100%', background: loading ? '#1A1820' : '#D4A853', color: loading ? '#3A3040' : '#09080A', border: 'none', borderRadius: 14, padding: '15px', fontSize: 16, fontWeight: 800, cursor: loading ? 'default' : 'pointer', transition: 'all 0.2s' }}
        >
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>
      </div>
    </div>
  );
}

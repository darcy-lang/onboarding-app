import { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import AgentDashboard from './components/AgentDashboard.jsx';
import DCDashboard from './components/DCDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.user) setUser(data.user); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#09080A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#3A3040' }}>Loading...</div>
    </div>
  );

  if (!user) return <Login onLogin={setUser} />;
  if (user.role === 'agent') return <AgentDashboard user={user} onLogout={handleLogout} />;
  if (user.role === 'dc') return <DCDashboard user={user} onLogout={handleLogout} />;
  if (user.role === 'admin') return <AdminDashboard user={user} onLogout={handleLogout} />;

  return <Login onLogin={setUser} />;
}

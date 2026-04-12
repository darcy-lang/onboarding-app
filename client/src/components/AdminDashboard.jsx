import { useState, useEffect } from 'react';
import VideoUploadPanel from './VideoUploadPanel.jsx';

export default function AdminDashboard({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'agent', name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetId, setResetId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = () => {
    fetch('/api/user/all-users', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setUsers(data.users || []); setLoading(false); });
  };

  useEffect(() => { loadUsers(); }, []);

  const createUser = async () => {
    setError(''); setSuccess('');
    if (!form.username || !form.password || !form.name) return setError('All fields required');
    const res = await fetch('/api/user/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setSuccess(`User "${form.username}" created successfully`);
    setForm({ username: '', password: '', role: 'agent', name: '' });
    loadUsers();
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    await fetch(`/api/user/${id}`, { method: 'DELETE', credentials: 'include' });
    loadUsers();
  };

  const resetPassword = async (id) => {
    if (!newPassword || newPassword.length < 6) return setError('Password must be at least 6 characters');
    await fetch(`/api/user/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password: newPassword })
    });
    setResetId(null); setNewPassword(''); setSuccess('Password updated');
  };

  const roleColor = { agent: '#D4A853', dc: '#6BAE94', admin: '#9B7EC8' };

  if (loading) return <div style={{ minHeight: '100vh', background: '#09080A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9B7EC8' }}>Loading...</div>;

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: '#09080A', minHeight: '100vh', color: '#DDD5C8' }}>
      <div style={{ background: '#0C0B0E', borderBottom: '1px solid #1A1820', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: '#9B7EC8', letterSpacing: '0.25em', textTransform: 'uppercase' }}>Admin</div>
          <div style={{ fontSize: 16, color: '#EEE5D5', fontWeight: 700 }}>🏡 {user.name} — User Management</div>
        </div>
        <button onClick={onLogout} style={{ background: 'transparent', border: '1px solid #2A2430', color: '#4A4050', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>Sign Out</button>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px' }}>

        {/* Create User */}
        <div style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 16, padding: '20px', marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#9B7EC8', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>Add New User</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" style={{ background: '#100F14', border: '1px solid #2A2430', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#EEE5D5', outline: 'none' }} />
            <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="Username" autoCapitalize="none" style={{ background: '#100F14', border: '1px solid #2A2430', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#EEE5D5', outline: 'none' }} />
            <input value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Password" style={{ background: '#100F14', border: '1px solid #2A2430', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#EEE5D5', outline: 'none' }} />
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ background: '#100F14', border: '1px solid #2A2430', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#EEE5D5', outline: 'none' }}>
              <option value="agent">Agent</option>
              <option value="dc">Director Comercial</option>
            </select>
          </div>
          {error && <div style={{ color: '#E07B6A', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          {success && <div style={{ color: '#6BAE94', fontSize: 13, marginBottom: 10 }}>{success}</div>}
          <button onClick={createUser} style={{ background: '#9B7EC8', color: '#09080A', border: 'none', borderRadius: 10, padding: '12px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Create User →</button>
        </div>

        {/* User List */}
        <div style={{ fontSize: 12, color: '#3A3040', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>All Users ({users.length})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => (
            <div key={u.id} style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#EEE5D5', fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: '#3A3040', marginTop: 2 }}>@{u.username}</div>
                </div>
                <div style={{ background: `${roleColor[u.role]}20`, border: `1px solid ${roleColor[u.role]}40`, borderRadius: 6, padding: '3px 10px', fontSize: 11, color: roleColor[u.role], fontWeight: 700 }}>{u.role}</div>
                {u.role !== 'admin' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setResetId(resetId === u.id ? null : u.id); setNewPassword(''); }} style={{ background: 'transparent', border: '1px solid #2A2430', color: '#6A6070', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Reset PW</button>
                    <button onClick={() => deleteUser(u.id, u.name)} style={{ background: 'transparent', border: '1px solid #3A1A1A', color: '#E07B6A', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                  </div>
                )}
              </div>
              {resetId === u.id && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" style={{ flex: 1, background: '#100F14', border: '1px solid #2A2430', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EEE5D5', outline: 'none' }} />
                  <button onClick={() => resetPassword(u.id)} style={{ background: '#D4A853', color: '#09080A', border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Save</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Training Videos */}
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 12, color: '#9B7EC8', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>Training Videos</div>
          <VideoUploadPanel />
        </div>
      </div>
    </div>
  );
}

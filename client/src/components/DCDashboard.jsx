import { useState, useEffect } from 'react';
import DCMorningPrompt from './DCMorningPrompt.jsx';
import VideoCard from './VideoCard.jsx';
import VideoUploadPanel from './VideoUploadPanel.jsx';
import AgentProfileView from './AgentProfileView.jsx';
import TeamDashboard from './TeamDashboard.jsx';
import { DC_WEEKS, PHASE_COLORS, PHASE_LABELS } from '../data.js';

export default function DCDashboard({ user, onLogout }) {
  const [wi, setWi] = useState(0);
  const [done, setDone] = useState({});
  const [tab, setTab] = useState('tasks');
  const [showPrompt, setShowPrompt] = useState(false);
  const [agentOverview, setAgentOverview] = useState([]);
  const [viewingAgentId, setViewingAgentId] = useState(null);
  const [showTeamDashboard, setShowTeamDashboard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [videoUrls, setVideoUrls] = useState({});
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'agent', name: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [resetId, setResetId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/user/dc-progress', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/user/agent-overview', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/videos', { credentials: 'include' }).then(r => r.json())
    ]).then(([prog, overview, vids]) => {
      setDone(prog.progress || {});
      setAgentOverview(overview.agents || []);
      setVideoUrls(vids.videos || {});
      setLoading(false);
    });
    fetch('/api/user/all-users', { credentials: 'include' }).then(r => r.json()).then(data => setUsers(data.users || []));
  }, []);

  const toggleTask = (weekIdx, taskIdx, completed) => {
    const key = `${weekIdx}-${taskIdx}`;
    setDone(p => ({ ...p, [key]: completed }));
    fetch('/api/user/dc-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ week_index: weekIdx, task_index: taskIdx, completed })
    });
  };

  const loadUsers = () => {
    fetch('/api/user/all-users', { credentials: 'include' }).then(r => r.json()).then(data => setUsers(data.users || []));
  };

  const createUser = async () => {
    setFormError(''); setFormSuccess('');
    if (!form.username || !form.password || !form.name) return setFormError('All fields required');
    const res = await fetch('/api/user/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) return setFormError(data.error);
    setFormSuccess(`User "${form.username}" created`);
    setForm({ username: '', password: '', role: 'agent', name: '' });
    loadUsers();
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    await fetch(`/api/user/${id}`, { method: 'DELETE', credentials: 'include' });
    loadUsers();
  };

  const resetPassword = async (id) => {
    if (!newPassword || newPassword.length < 6) return setFormError('Password must be at least 6 characters');
    await fetch(`/api/user/${id}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ password: newPassword }) });
    setResetId(null); setNewPassword(''); setFormSuccess('Password updated');
  };

  const roleColor = { agent: '#D4A853', dc: '#6BAE94', admin: '#9B7EC8' };

  if (loading) return <div style={{ minHeight: '100vh', background: '#09080A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6BAE94', fontSize: 14 }}>Loading...</div>;

  const week = DC_WEEKS[wi];
  const ac = PHASE_COLORS[week.phase];
  const totalTasks = DC_WEEKS.flatMap(w => w.tasks).length;
  const doneCt = Object.values(done).filter(Boolean).length;
  const pct = Math.round((doneCt / totalTasks) * 100);
  const wkDone = week.tasks.filter((_, i) => done[`${wi}-${i}`]).length;
  const wkPct = Math.round((wkDone / week.tasks.length) * 100);
  const allDone = wkDone === week.tasks.length;
  const wkVideos = week.videos || [];
  const tabs = ['tasks', ...(wkVideos.length > 0 ? ['videos'] : []), 'manage videos', 'manage users'];

  if (showTeamDashboard) return <TeamDashboard onBack={() => setShowTeamDashboard(false)} />;

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: '#09080A', minHeight: '100vh', color: '#DDD5C8', display: 'flex', flexDirection: 'column' }}>
      {showPrompt && <DCMorningPrompt onClose={() => setShowPrompt(false)} />}
      {viewingAgentId && <AgentProfileView agentId={viewingAgentId} onClose={() => setViewingAgentId(null)} />}

      <div style={{ background: '#0C0B0E', borderBottom: '1px solid #1A1820', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14, color: '#EEE5D5', fontWeight: 700 }}>👩‍💼 {user.name}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#3A3040' }}>{pct}% done</div>
          <button onClick={() => setShowTeamDashboard(true)} style={{ background: '#D4A853', color: '#09080A', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>📊 Team</button>
          <button onClick={() => setShowPrompt(true)} style={{ background: '#6BAE94', color: '#09080A', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🌅 My Focus</button>
          <button onClick={onLogout} style={{ background: 'transparent', border: '1px solid #2A2430', color: '#4A4050', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>Sign Out</button>
        </div>
      </div>

      <div style={{ height: 3, background: '#191714' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6BAE94,#EEE5D5)', transition: 'width 0.5s' }} />
      </div>

      <div style={{ background: '#0A090D', borderBottom: '1px solid #1A1820', display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
        {DC_WEEKS.map((w, i) => {
          const wd = w.tasks.filter((_, ti) => done[`${i}-${ti}`]).length;
          return (
            <button key={i} onClick={() => { setWi(i); setTab('tasks'); }} style={{ background: 'transparent', border: 'none', borderBottom: `3px solid ${i === wi ? PHASE_COLORS[w.phase] : 'transparent'}`, padding: '10px 13px', cursor: 'pointer', color: i === wi ? PHASE_COLORS[w.phase] : '#2A2430', fontSize: 11, fontWeight: i === wi ? 700 : 400, whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0 }}>
              Wk {w.week}{wd === w.tasks.length && <span style={{ marginLeft: 3, color: '#6BAE94' }}>✓</span>}
            </button>
          );
        })}
      </div>

      <div className="fi" key={wi} style={{ flex: 1, overflowY: 'auto', padding: '22px 18px', maxWidth: 760, width: '100%', margin: '0 auto' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', color: ac, textTransform: 'uppercase', marginBottom: 8 }}>{PHASE_LABELS[week.phase]} · {week.days}</div>

        <div style={{ background: `${ac}12`, border: `1.5px solid ${ac}35`, borderRadius: 16, padding: '20px', marginBottom: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: ac, textTransform: 'uppercase', marginBottom: 8 }}>Your Focus This Week</div>
          <div style={{ fontSize: 19, color: '#EEE5D5', lineHeight: 1.4, fontWeight: 700 }}>{week.action}</div>
        </div>

        {/* Agent Overview */}
        {agentOverview.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#3A3040', textTransform: 'uppercase', marginBottom: 12 }}>Agent Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {agentOverview.map(agent => (
                <div key={agent.id} onClick={() => setViewingAgentId(agent.id)} style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 13, color: '#EEE5D5', fontWeight: 600, marginBottom: 6 }}>{agent.name} <span style={{ fontSize: 10, color: '#3A3040' }}>→ View</span></div>
                  <div style={{ fontSize: 11, color: '#3A3040', marginBottom: 2 }}>Week {agent.current_week + 1} · {agent.completed_tasks} tasks done</div>
                  <div style={{ fontSize: 11, color: agent.committed ? '#6BAE94' : '#D4A853' }}>{agent.committed ? '✓ Committed' : '⏳ Not yet committed'}</div>
                  {agent.last_checkin && <div style={{ fontSize: 10, color: '#2A2430', marginTop: 4 }}>Last check-in: {agent.last_checkin.date}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', borderBottom: '1px solid #1A1820', marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t ? ac : 'transparent'}`, color: tab === t ? ac : '#3A3040', padding: '7px 14px', cursor: 'pointer', fontSize: 12, textTransform: 'capitalize', transition: 'all 0.15s', marginBottom: -1 }}>{t}</button>
          ))}
        </div>

        {tab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {week.tasks.map((task, ti) => {
                const isDone = !!done[`${wi}-${ti}`];
                return (
                  <div key={ti} onClick={() => toggleTask(wi, ti, !isDone)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', cursor: 'pointer', borderRadius: 14, background: isDone ? '#0E1410' : '#0D0C10', border: `1px solid ${isDone ? '#6BAE9430' : '#1A1820'}`, transition: 'all 0.15s' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, border: `2px solid ${isDone ? '#6BAE94' : '#2A2430'}`, background: isDone ? '#6BAE94' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {isDone && <span style={{ color: '#09080A', fontSize: 13, fontWeight: 800 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 14, color: isDone ? '#3A4A3A' : '#C8C0B8', lineHeight: 1.5, textDecoration: isDone ? 'line-through' : 'none', flex: 1, transition: 'all 0.2s' }}>{task}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ background: '#0C0B0E', border: `1px solid ${ac}20`, borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#3A3040', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>Week Target</div>
              <div style={{ fontSize: 13, color: ac, lineHeight: 1.6 }}>{week.target}</div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 4, background: '#1A1820', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${wkPct}%`, background: ac, borderRadius: 2, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 11, color: '#3A3040' }}>{wkDone}/{week.tasks.length}</div>
            </div>
          </div>
        )}
        {tab === 'videos' && <div>{wkVideos.map(id => <VideoCard key={id} id={id} ac={ac} videoUrls={videoUrls} />)}</div>}
        {tab === 'manage videos' && <VideoUploadPanel />}
        {tab === 'manage users' && (
          <div>
            {/* Create User */}
            <div style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.2em', color: ac, textTransform: 'uppercase', marginBottom: 14 }}>Add New User</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" style={{ background: '#100F14', border: '1px solid #2A2430', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#EEE5D5', outline: 'none' }} />
                <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="Username" autoCapitalize="none" style={{ background: '#100F14', border: '1px solid #2A2430', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#EEE5D5', outline: 'none' }} />
                <input value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Password" style={{ background: '#100F14', border: '1px solid #2A2430', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#EEE5D5', outline: 'none' }} />
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ background: '#100F14', border: '1px solid #2A2430', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#EEE5D5', outline: 'none' }}>
                  <option value="agent">Agent</option>
                  <option value="dc">Director Comercial</option>
                </select>
              </div>
              {formError && <div style={{ color: '#E07B6A', fontSize: 13, marginBottom: 10 }}>{formError}</div>}
              {formSuccess && <div style={{ color: '#6BAE94', fontSize: 13, marginBottom: 10 }}>{formSuccess}</div>}
              <button onClick={createUser} style={{ background: ac, color: '#09080A', border: 'none', borderRadius: 10, padding: '12px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Create User</button>
            </div>

            {/* User List */}
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#3A3040', textTransform: 'uppercase', marginBottom: 10 }}>All Users ({users.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.map(u => (
                <div key={u.id} style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#EEE5D5', fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: '#3A3040', marginTop: 2 }}>@{u.username}</div>
                    </div>
                    <div style={{ background: `${roleColor[u.role]}20`, border: `1px solid ${roleColor[u.role]}40`, borderRadius: 6, padding: '3px 10px', fontSize: 11, color: roleColor[u.role], fontWeight: 700 }}>{u.role}</div>
                    {u.role === 'agent' && (
                      <button onClick={() => setViewingAgentId(u.id)} style={{ background: '#D4A85320', border: '1px solid #D4A85340', color: '#D4A853', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>View Profile</button>
                    )}
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
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          {wi > 0 && <button onClick={() => { setWi(wi - 1); setTab('tasks'); }} style={{ flex: 1, background: '#0D0C10', border: '1px solid #1A1820', color: '#3A3040', padding: '13px', borderRadius: 14, cursor: 'pointer', fontSize: 13 }}>← Week {DC_WEEKS[wi - 1].week}</button>}
          {wi < DC_WEEKS.length - 1 && (
            <button onClick={() => { setWi(wi + 1); setTab('tasks'); }} style={{ flex: 2, background: ac, border: 'none', color: '#09080A', padding: '13px', borderRadius: 14, cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>
              {allDone ? `✓ Week done — Week ${DC_WEEKS[wi + 1].week} →` : `Week ${DC_WEEKS[wi + 1].week} →`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

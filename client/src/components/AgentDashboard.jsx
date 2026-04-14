import { useState, useEffect } from 'react';
import CommitmentScreen from './CommitmentScreen.jsx';
import DailyCheckIn from './DailyCheckIn.jsx';
import VideoCard from './VideoCard.jsx';
import { AGENT_WEEKS, PHASE_COLORS, PHASE_LABELS, TRAINING_VIDEOS } from '../data.js';

export default function AgentDashboard({ user, onLogout }) {
  const [committed, setCommitted] = useState(false);
  const [wi, setWi] = useState(0);
  const [done, setDone] = useState({});
  const [tab, setTab] = useState('tasks');
  const [showCheckin, setShowCheckin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [videoUrls, setVideoUrls] = useState({});
  const [trainingUrls, setTrainingUrls] = useState({});
  const [tracker, setTracker] = useState({ doors: 0, contacts: 0, appointments: 0, viewings: 0, offers: 0 });
  const [totals, setTotals] = useState({ doors: 0, contacts: 0, appointments: 0, viewings: 0, offers: 0 });

  useEffect(() => {
    fetch('/api/user/progress', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setDone(data.progress || {});
        setCommitted(!!data.state?.committed);
        setWi(data.state?.current_week || 0);
        setLoading(false);
      });
    fetch('/api/videos', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setVideoUrls(data.videos || {}));
    fetch('/api/user/tracker', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setTracker(data.today || {}); setTotals(data.totals || {}); });
    fetch('/api/videos/training', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setTrainingUrls(data.videos || {}));
  }, []);

  const saveState = (newCommitted, newWi) => {
    fetch('/api/user/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ committed: newCommitted, current_week: newWi })
    });
  };

  const handleCommit = () => {
    setCommitted(true);
    saveState(true, wi);
  };

  const toggleTask = (weekIdx, taskIdx, completed) => {
    const key = `${weekIdx}-${taskIdx}`;
    setDone(p => ({ ...p, [key]: completed }));
    fetch('/api/user/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ week_index: weekIdx, task_index: taskIdx, completed })
    });
  };

  const changeWeek = (newWi) => {
    setWi(newWi);
    setTab('tasks');
    saveState(committed, newWi);
  };

  const updateTracker = (field, value) => {
    const v = Math.max(0, parseInt(value) || 0);
    const updated = { ...tracker, [field]: v };
    setTracker(updated);
    setTotals(prev => ({ ...prev, [field]: (parseInt(prev[field]) || 0) - (parseInt(tracker[field]) || 0) + v }));
    fetch('/api/user/tracker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(updated) });
  };

  const updateTotal = (field, newTotal, goal) => {
    const currentTotal = parseInt(totals[field]) || 0;
    const currentToday = parseInt(tracker[field]) || 0;
    const baseTotal = currentTotal - currentToday;
    const newToday = Math.max(0, parseInt(newTotal) - baseTotal);
    updateTracker(field, newToday);
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#09080A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4A853', fontSize: 14 }}>Loading...</div>;
  if (!committed) return <CommitmentScreen agentName={user.name} onComplete={handleCommit} />;

  const week = AGENT_WEEKS[wi];
  const ac = PHASE_COLORS[week.phase];
  const totalTasks = AGENT_WEEKS.flatMap(w => w.tasks).length;
  const doneCt = Object.values(done).filter(Boolean).length;
  const pct = Math.round((doneCt / totalTasks) * 100);
  const wkDone = week.tasks.filter((_, i) => done[`${wi}-${i}`]).length;
  const wkPct = Math.round((wkDone / week.tasks.length) * 100);
  const allDone = wkDone === week.tasks.length;
  const wkTraining = TRAINING_VIDEOS.filter(v => v.week === wi && trainingUrls[v.id]);
  const tabs = ['tasks', ...(wkTraining.length > 0 ? ['videos'] : []), ...(week.script ? ['script'] : [])];

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: '#09080A', minHeight: '100vh', color: '#DDD5C8', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .goal-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 50%;
          background: #EEE5D5; border: 2px solid #09080A;
          cursor: pointer; margin-top: -6px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.5);
        }
        .goal-slider::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: #EEE5D5; border: 2px solid #09080A;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.5);
        }
      `}</style>
      {showCheckin && <DailyCheckIn agentName={user.name} currentWeek={wi} weekAction={week.action} onClose={() => setShowCheckin(false)} />}

      <div style={{ background: '#0C0B0E', borderBottom: '1px solid #1A1820', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14, color: '#EEE5D5', fontWeight: 700 }}>🧑‍💼 {user.name}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#3A3040' }}>{pct}% done</div>
          <button onClick={() => setShowCheckin(true)} style={{ background: '#D4A853', color: '#09080A', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>☀️ Check In</button>
          <button onClick={onLogout} style={{ background: 'transparent', border: '1px solid #2A2430', color: '#4A4050', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>Sign Out</button>
        </div>
      </div>

      <div style={{ height: 3, background: '#191714' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${ac},#EEE5D5)`, transition: 'width 0.5s' }} />
      </div>

      <div style={{ background: '#0A090D', borderBottom: '1px solid #1A1820', display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
        {AGENT_WEEKS.map((w, i) => {
          const wd = w.tasks.filter((_, ti) => done[`${i}-${ti}`]).length;
          return (
            <button key={i} onClick={() => changeWeek(i)} style={{ background: 'transparent', border: 'none', borderBottom: `3px solid ${i === wi ? PHASE_COLORS[w.phase] : 'transparent'}`, padding: '10px 13px', cursor: 'pointer', color: i === wi ? PHASE_COLORS[w.phase] : '#2A2430', fontSize: 11, fontWeight: i === wi ? 700 : 400, whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0 }}>
              Wk {w.week}{wd === w.tasks.length && <span style={{ marginLeft: 3, color: '#6BAE94' }}>✓</span>}
            </button>
          );
        })}
      </div>

      <div className="fi" key={wi} style={{ flex: 1, overflowY: 'auto', padding: '22px 16px', maxWidth: 600, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', color: ac, textTransform: 'uppercase' }}>{PHASE_LABELS[week.phase]} · {week.days}</div>
          <div style={{ fontSize: 12, color: '#3A3040' }}>Hey {user.name} 👋</div>
        </div>

        <div style={{ background: `${ac}12`, border: `1.5px solid ${ac}35`, borderRadius: 16, padding: '18px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: ac, textTransform: 'uppercase', marginBottom: 6 }}>Your Priority This Week</div>
          <div style={{ fontSize: 17, color: '#EEE5D5', lineHeight: 1.4, fontWeight: 700 }}>{week.action}</div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #1A1820', marginBottom: 14 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t ? ac : 'transparent'}`, color: tab === t ? ac : '#3A3040', padding: '7px 14px', cursor: 'pointer', fontSize: 12, textTransform: 'capitalize', transition: 'all 0.15s', marginBottom: -1 }}>{t}</button>
          ))}
        </div>

        {tab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {week.tasks.map((task, ti) => {
                const isDone = !!done[`${wi}-${ti}`];
                return (
                  <div key={ti} onClick={() => toggleTask(wi, ti, !isDone)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', cursor: 'pointer', borderRadius: 12, background: isDone ? '#0E1410' : '#0D0C10', border: `1px solid ${isDone ? '#6BAE9430' : '#1A1820'}`, transition: 'all 0.15s' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: `2px solid ${isDone ? '#6BAE94' : '#2A2430'}`, background: isDone ? '#6BAE94' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {isDone && <span style={{ color: '#09080A', fontSize: 12, fontWeight: 800 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: isDone ? '#3A4A3A' : '#C8C0B8', lineHeight: 1.5, textDecoration: isDone ? 'line-through' : 'none', flex: 1, transition: 'all 0.2s' }}>{task}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ background: '#0C0B0E', border: `1px solid ${ac}20`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#3A3040', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>Week Target</div>
                <div style={{ fontSize: 13, color: ac, lineHeight: 1.6 }}>{week.target}</div>
              </div>
              {allDone && <div style={{ fontSize: 22 }}>🎉</div>}
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 4, background: '#1A1820', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${wkPct}%`, background: ac, borderRadius: 2, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 11, color: '#3A3040' }}>{wkDone}/{week.tasks.length}</div>
            </div>
          </div>
        )}
        {tab === 'videos' && (
          <div>
            {wkTraining.length > 0 ? wkTraining.map(tv => {
              const loomUrl = trainingUrls[tv.id];
              const embedMatch = loomUrl.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
              const embedUrl = embedMatch ? `https://www.loom.com/embed/${embedMatch[1]}` : null;
              return (
                <div key={tv.id} style={{ background: `${ac}0D`, border: `1px solid ${ac}35`, borderRadius: 12, padding: '14px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>🎓</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#EEE5D5', fontWeight: 500 }}>{tv.title}</div>
                      <div style={{ fontSize: 11, color: ac, marginTop: 2 }}>{tv.topic}</div>
                    </div>
                  </div>
                  {embedUrl ? (
                    <div style={{ marginTop: 10, position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 10, overflow: 'hidden' }}>
                      <iframe src={embedUrl} frameBorder="0" allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                    </div>
                  ) : (
                    <a href={loomUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 10, background: ac, color: '#080807', padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>▶ Watch Now</a>
                  )}
                </div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#3A3040', fontSize: 13 }}>No videos added for this week yet. Check back soon!</div>
            )}
          </div>
        )}
        {tab === 'script' && week.script && (
          <div style={{ background: '#0D0C10', border: `1px solid ${ac}25`, borderRadius: 14, padding: '18px' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: ac, textTransform: 'uppercase', marginBottom: 10 }}>{week.script.label}</div>
            <div style={{ fontSize: 14, color: '#B8B0A8', lineHeight: 1.9, fontStyle: 'italic' }}>{week.script.text}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {wi > 0 && <button onClick={() => changeWeek(wi - 1)} style={{ flex: 1, background: '#0D0C10', border: '1px solid #1A1820', color: '#3A3040', padding: '12px', borderRadius: 12, cursor: 'pointer', fontSize: 13 }}>← Wk {AGENT_WEEKS[wi - 1].week}</button>}
          {wi < AGENT_WEEKS.length - 1 && (
            <button onClick={() => changeWeek(wi + 1)} style={{ flex: 2, background: ac, border: 'none', color: '#09080A', padding: '12px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>
              {allDone ? `✓ Done — Wk ${AGENT_WEEKS[wi + 1].week} →` : `Week ${AGENT_WEEKS[wi + 1].week} →`}
            </button>
          )}
        </div>

        {/* 90-Day Goal Tracker — Below Checklist */}
        <div style={{ marginTop: 28, borderTop: '1px solid #1A1820', paddingTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', color: ac, textTransform: 'uppercase', fontWeight: 700 }}>🎯 90-Day Goals</div>
            {(() => {
              const fields = [
                { key: 'doors', goal: 400 }, { key: 'contacts', goal: 125 },
                { key: 'appointments', goal: 15 }, { key: 'viewings', goal: 12 }, { key: 'offers', goal: 2 }
              ];
              const overallPct = Math.round(fields.reduce((sum, f) => sum + Math.min(((parseInt(totals[f.key]) || 0) / f.goal) * 100, 100), 0) / fields.length);
              return <span style={{ fontSize: 14, color: overallPct >= 100 ? '#6BAE94' : ac, fontWeight: 800 }}>{overallPct}%</span>;
            })()}
          </div>

          {/* Overall progress bar */}
          {(() => {
            const fields = [
              { key: 'doors', goal: 400 }, { key: 'contacts', goal: 125 },
              { key: 'appointments', goal: 15 }, { key: 'viewings', goal: 12 }, { key: 'offers', goal: 2 }
            ];
            const overallPct = Math.round(fields.reduce((sum, f) => sum + Math.min(((parseInt(totals[f.key]) || 0) / f.goal) * 100, 100), 0) / fields.length);
            return (
              <div style={{ width: '100%', height: 8, background: '#1A1820', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ height: '100%', width: `${overallPct}%`, background: overallPct >= 100 ? '#6BAE94' : `linear-gradient(90deg, ${ac}, ${ac}DD)`, borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
            );
          })()}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { key: 'doors', label: 'Doors Knocked', icon: '🚪', goal: 400 },
              { key: 'contacts', label: 'New Contacts', icon: '📇', goal: 125 },
              { key: 'appointments', label: 'Appointments', icon: '📅', goal: 15 },
              { key: 'viewings', label: 'Viewings', icon: '🏠', goal: 12 },
              { key: 'offers', label: 'Offers', icon: '📝', goal: 2 },
            ].map(f => {
              const total = parseInt(totals[f.key]) || 0;
              const goalPct = Math.min((total / f.goal) * 100, 100);
              const goalDone = total >= f.goal;
              return (
                <div key={f.key} style={{ background: '#0D0C10', border: `1px solid ${goalDone ? '#6BAE9430' : '#1A1820'}`, borderRadius: 12, padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{f.icon}</span>
                      <span style={{ fontSize: 13, color: '#B8B0A8' }}>{f.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 20, color: goalDone ? '#6BAE94' : '#EEE5D5', fontWeight: 800 }}>{total}</span>
                      <span style={{ fontSize: 11, color: '#3A3040' }}>/ {f.goal}</span>
                      {goalDone && <span style={{ fontSize: 13, marginLeft: 4 }}>✅</span>}
                    </div>
                  </div>
                  <input
                    className="goal-slider"
                    type="range"
                    min="0"
                    max={f.goal}
                    value={Math.min(total, f.goal)}
                    onChange={e => updateTotal(f.key, e.target.value, f.goal)}
                    style={{ width: '100%', height: 6, appearance: 'none', WebkitAppearance: 'none', background: `linear-gradient(to right, ${goalDone ? '#6BAE94' : ac} ${goalPct}%, #1A1820 ${goalPct}%)`, borderRadius: 3, outline: 'none', cursor: 'pointer' }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

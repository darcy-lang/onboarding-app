import { useState } from 'react';
import VideoCard from './VideoCard.jsx';
import { PHASE_COLORS, PHASE_LABELS } from '../data.js';

export default function WeekView({ weeks, wi, setWi, done, toggleTask, role, accentColor, agentName }) {
  const week = weeks[wi];
  const ac = accentColor || PHASE_COLORS[week.phase];
  const wkDone = week.tasks.filter((_, i) => done[`${wi}-${i}`]).length;
  const wkPct = Math.round((wkDone / week.tasks.length) * 100);
  const allDone = wkDone === week.tasks.length;
  const wkVideos = week.videos || [];

  const [tab, setTab] = useState('tasks');

  return (
    <div className="fi" style={{ flex: 1, overflowY: 'auto', padding: '22px 18px', maxWidth: 680, width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', color: ac, textTransform: 'uppercase' }}>{PHASE_LABELS[week.phase]} · {week.days}</div>
        {role === 'agent' && agentName && <div style={{ fontSize: 12, color: '#3A3040' }}>Hey {agentName} 👋</div>}
        {wkPct === 100 && <div style={{ fontSize: 12, color: '#6BAE94' }}>✓ Week done</div>}
      </div>

      <div style={{ background: `${ac}12`, border: `1.5px solid ${ac}35`, borderRadius: 16, padding: '20px', marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: ac, textTransform: 'uppercase', marginBottom: 8 }}>
          {role === 'agent' ? 'Your Priority This Week' : 'Your Focus This Week'}
        </div>
        <div style={{ fontSize: 19, color: '#EEE5D5', lineHeight: 1.4, fontWeight: 700 }}>{week.action}</div>
      </div>

      {role === 'agent' && week.dc && (
        <div style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>👩‍💼</span>
          <div>
            <div style={{ fontSize: 10, color: '#4A4060', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Director Comercial this week</div>
            <div style={{ fontSize: 12, color: '#6A6080', lineHeight: 1.6 }}>{week.dc}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid #1A1820', marginBottom: 16 }}>
        {['tasks', ...(wkVideos.length > 0 ? ['videos'] : []), ...(week.script ? ['script'] : [])].map(t => (
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
          <div style={{ background: '#0C0B0E', border: `1px solid ${ac}20`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: '#3A3040', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>Week Target</div>
              <div style={{ fontSize: 13, color: ac, lineHeight: 1.6 }}>{week.target}</div>
            </div>
            {allDone && <div style={{ fontSize: 24 }}>🎉</div>}
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 4, background: '#1A1820', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${wkPct}%`, background: ac, borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#3A3040' }}>{wkDone}/{week.tasks.length}</div>
          </div>
        </div>
      )}

      {tab === 'videos' && (
        <div>
          {wkVideos.length === 0
            ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#2A2430', fontSize: 14 }}>No videos this week.</div>
            : wkVideos.map(id => <VideoCard key={id} id={id} ac={ac} />)
          }
        </div>
      )}

      {tab === 'script' && week.script && (
        <div style={{ background: '#0D0C10', border: `1px solid ${ac}25`, borderRadius: 16, padding: '20px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: ac, textTransform: 'uppercase', marginBottom: 12 }}>{week.script.label}</div>
          <div style={{ fontSize: 15, color: '#B8B0A8', lineHeight: 1.9, fontStyle: 'italic' }}>{week.script.text}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
        {wi > 0 && <button onClick={() => { setWi(p => p - 1); setTab('tasks'); }} style={{ flex: 1, background: '#0D0C10', border: '1px solid #1A1820', color: '#3A3040', padding: '13px', borderRadius: 14, cursor: 'pointer', fontSize: 13 }}>← Week {weeks[wi - 1].week}</button>}
        {wi < weeks.length - 1 && (
          <button onClick={() => { setWi(p => p + 1); setTab('tasks'); }} style={{ flex: 2, background: ac, border: 'none', color: '#09080A', padding: '13px', borderRadius: 14, cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>
            {allDone ? `✓ Week done — Week ${weeks[wi + 1].week} →` : `Week ${weeks[wi + 1].week} →`}
          </button>
        )}
      </div>
    </div>
  );
}

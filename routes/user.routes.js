import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

// ── AGENT PROGRESS ─────────────────────────────────────────────

// GET /api/user/progress — get agent's task completion
router.get('/progress', requireAuth, requireRole('agent'), (req, res) => {
  const rows = db.prepare('SELECT week_index, task_index, completed FROM agent_progress WHERE user_id = ?').all(req.user.id);
  const progress = {};
  rows.forEach(r => { progress[`${r.week_index}-${r.task_index}`] = !!r.completed; });

  const state = db.prepare('SELECT * FROM agent_state WHERE user_id = ?').get(req.user.id);
  res.json({ progress, state: state || { committed: 0, current_week: 0 } });
});

// POST /api/user/progress — toggle a task
router.post('/progress', requireAuth, requireRole('agent'), (req, res) => {
  const { week_index, task_index, completed } = req.body;
  db.prepare(`
    INSERT INTO agent_progress (user_id, week_index, task_index, completed, completed_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, week_index, task_index) DO UPDATE SET
      completed = excluded.completed,
      completed_at = excluded.completed_at
  `).run(req.user.id, week_index, task_index, completed ? 1 : 0, completed ? new Date().toISOString() : null);
  res.json({ ok: true });
});

// POST /api/user/state — save agent state (committed, current_week)
router.post('/state', requireAuth, requireRole('agent'), (req, res) => {
  const { committed, current_week } = req.body;
  db.prepare(`
    INSERT INTO agent_state (user_id, committed, current_week)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      committed = excluded.committed,
      current_week = excluded.current_week
  `).run(req.user.id, committed ? 1 : 0, current_week || 0);
  res.json({ ok: true });
});

// POST /api/user/checkin — save daily check-in
router.post('/checkin', requireAuth, requireRole('agent'), (req, res) => {
  const { date, morning_answer, evening_done, evening_note } = req.body;
  db.prepare(`
    INSERT INTO checkins (user_id, date, morning_answer, evening_done, evening_note)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT DO NOTHING
  `).run(req.user.id, date, morning_answer || null, evening_done != null ? (evening_done ? 1 : 0) : null, evening_note || null);
  res.json({ ok: true });
});

// ── DC PROGRESS ────────────────────────────────────────────────

// GET /api/user/dc-progress
router.get('/dc-progress', requireAuth, requireRole('dc', 'admin'), (req, res) => {
  const rows = db.prepare('SELECT week_index, task_index, completed FROM dc_progress WHERE user_id = ?').all(req.user.id);
  const progress = {};
  rows.forEach(r => { progress[`${r.week_index}-${r.task_index}`] = !!r.completed; });
  res.json({ progress });
});

// POST /api/user/dc-progress
router.post('/dc-progress', requireAuth, requireRole('dc', 'admin'), (req, res) => {
  const { week_index, task_index, completed } = req.body;
  db.prepare(`
    INSERT INTO dc_progress (user_id, week_index, task_index, completed, completed_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, week_index, task_index) DO UPDATE SET
      completed = excluded.completed,
      completed_at = excluded.completed_at
  `).run(req.user.id, week_index, task_index, completed ? 1 : 0, completed ? new Date().toISOString() : null);
  res.json({ ok: true });
});

// POST /api/user/dc-prompt — save DC morning prompt
router.post('/dc-prompt', requireAuth, requireRole('dc', 'admin'), (req, res) => {
  const { date, focus_answer, win_answer } = req.body;
  db.prepare(`
    INSERT INTO dc_prompts (user_id, date, focus_answer, win_answer)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, date, focus_answer || null, win_answer || null);
  res.json({ ok: true });
});

// ── ADMIN ──────────────────────────────────────────────────────

// GET /api/user/all-users — dc and admin
router.get('/all-users', requireAuth, requireRole('dc', 'admin'), (req, res) => {
  const users = db.prepare('SELECT id, username, role, name, created_at FROM users ORDER BY created_at').all();
  res.json({ users });
});

// POST /api/user/create — dc/admin creates a new user
router.post('/create', requireAuth, requireRole('dc', 'admin'), (req, res) => {
  const { username, password, role, name } = req.body;
  if (!username || !password || !role || !name) return res.status(400).json({ error: 'All fields required' });
  if (!['agent', 'dc'].includes(role)) return res.status(400).json({ error: 'Role must be agent or dc' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run(username.toLowerCase().trim(), hash, role, name);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/user/:id — dc/admin deletes a user
router.delete('/:id', requireAuth, requireRole('dc', 'admin'), (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  db.prepare('DELETE FROM agent_progress WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM agent_state WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM dc_progress WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM checkins WHERE user_id = ?').run(id);
  res.json({ ok: true });
});

// POST /api/user/:id/reset-password — dc/admin resets password
router.post('/:id/reset-password', requireAuth, requireRole('dc', 'admin'), (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, parseInt(req.params.id));
  res.json({ ok: true });
});

// GET /api/user/agent-overview — DC sees all agents progress summary
router.get('/agent-overview', requireAuth, requireRole('dc', 'admin'), (req, res) => {
  const agents = db.prepare('SELECT id, name, username, created_at FROM users WHERE role = ?').all('agent');
  const result = agents.map(agent => {
    const state = db.prepare('SELECT committed, current_week FROM agent_state WHERE user_id = ?').get(agent.id);
    const completedTasks = db.prepare('SELECT COUNT(*) as count FROM agent_progress WHERE user_id = ? AND completed = 1').get(agent.id);
    const totalCheckins = db.prepare('SELECT COUNT(*) as count FROM checkins WHERE user_id = ?').get(agent.id);
    const completedCheckins = db.prepare('SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND evening_done = 1').get(agent.id);
    const lastCheckin = db.prepare('SELECT date, evening_done, morning_answer FROM checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(agent.id);
    const progressRows = db.prepare('SELECT week_index, task_index, completed FROM agent_progress WHERE user_id = ?').all(agent.id);
    const weekProgress = {};
    progressRows.forEach(r => {
      if (!weekProgress[r.week_index]) weekProgress[r.week_index] = { done: 0, total: 0 };
      weekProgress[r.week_index].total++;
      if (r.completed) weekProgress[r.week_index].done++;
    });
    return {
      id: agent.id,
      name: agent.name,
      username: agent.username,
      created_at: agent.created_at,
      committed: state?.committed || 0,
      current_week: state?.current_week || 0,
      completed_tasks: completedTasks?.count || 0,
      total_checkins: totalCheckins?.count || 0,
      completed_checkins: completedCheckins?.count || 0,
      last_checkin: lastCheckin || null,
      week_progress: weekProgress
    };
  });
  res.json({ agents: result });
});

// GET /api/user/agent/:id/dc-tasks — DC's own checklist for this agent
router.get('/agent/:id/dc-tasks', requireAuth, requireRole('dc', 'admin'), (req, res) => {
  const agentId = parseInt(req.params.id);
  const rows = db.prepare('SELECT week_index, task_index, completed FROM dc_agent_tasks WHERE dc_user_id = ? AND agent_id = ?').all(req.user.id, agentId);
  const progress = {};
  rows.forEach(r => { progress[`${r.week_index}-${r.task_index}`] = !!r.completed; });
  res.json({ progress });
});

// POST /api/user/agent/:id/dc-tasks — toggle a DC task for this agent
router.post('/agent/:id/dc-tasks', requireAuth, requireRole('dc', 'admin'), (req, res) => {
  const agentId = parseInt(req.params.id);
  const { week_index, task_index, completed } = req.body;
  db.prepare(`
    INSERT INTO dc_agent_tasks (dc_user_id, agent_id, week_index, task_index, completed, completed_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(dc_user_id, agent_id, week_index, task_index) DO UPDATE SET
      completed = excluded.completed,
      completed_at = excluded.completed_at
  `).run(req.user.id, agentId, week_index, task_index, completed ? 1 : 0, completed ? new Date().toISOString() : null);
  res.json({ ok: true });
});

// GET /api/user/agent/:id/profile — DC/Admin sees full agent progress
router.get('/agent/:id/profile', requireAuth, requireRole('dc', 'admin'), (req, res) => {
  const agentId = parseInt(req.params.id);
  const agent = db.prepare('SELECT id, name, username, created_at FROM users WHERE id = ? AND role = ?').get(agentId, 'agent');
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const state = db.prepare('SELECT committed, current_week FROM agent_state WHERE user_id = ?').get(agentId);
  const progressRows = db.prepare('SELECT week_index, task_index, completed FROM agent_progress WHERE user_id = ?').all(agentId);
  const progress = {};
  progressRows.forEach(r => { progress[`${r.week_index}-${r.task_index}`] = !!r.completed; });

  const checkins = db.prepare('SELECT date, morning_answer, evening_done, evening_note FROM checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 14').all(agentId);

  res.json({
    agent: {
      ...agent,
      committed: state?.committed || 0,
      current_week: state?.current_week || 0,
    },
    progress,
    checkins
  });
});

export default router;

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

// ── AGENT PROGRESS ─────────────────────────────────────────────

// GET /api/user/progress — get agent's task completion
router.get('/progress', requireAuth, requireRole('agent'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT week_index, task_index, completed FROM agent_progress WHERE user_id = $1', [req.user.id]);
    const progress = {};
    rows.forEach(r => { progress[`${r.week_index}-${r.task_index}`] = !!r.completed; });

    const stateRes = await pool.query('SELECT * FROM agent_state WHERE user_id = $1', [req.user.id]);
    const state = stateRes.rows[0];
    res.json({ progress, state: state || { committed: 0, current_week: 0 } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/user/progress — toggle a task
router.post('/progress', requireAuth, requireRole('agent'), async (req, res) => {
  try {
    const { week_index, task_index, completed } = req.body;
    await pool.query(`
      INSERT INTO agent_progress (user_id, week_index, task_index, completed, completed_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT(user_id, week_index, task_index) DO UPDATE SET
        completed = EXCLUDED.completed,
        completed_at = EXCLUDED.completed_at
    `, [req.user.id, week_index, task_index, completed ? 1 : 0, completed ? new Date().toISOString() : null]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/user/state — save agent state (committed, current_week)
router.post('/state', requireAuth, requireRole('agent'), async (req, res) => {
  try {
    const { committed, current_week } = req.body;
    await pool.query(`
      INSERT INTO agent_state (user_id, committed, current_week)
      VALUES ($1, $2, $3)
      ON CONFLICT(user_id) DO UPDATE SET
        committed = EXCLUDED.committed,
        current_week = EXCLUDED.current_week
    `, [req.user.id, committed ? 1 : 0, current_week || 0]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/user/checkin — save daily check-in
router.post('/checkin', requireAuth, requireRole('agent'), async (req, res) => {
  try {
    const { date, morning_answer, evening_done, evening_note } = req.body;
    await pool.query(`
      INSERT INTO checkins (user_id, date, morning_answer, evening_done, evening_note)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.user.id, date, morning_answer || null, evening_done != null ? (evening_done ? 1 : 0) : null, evening_note || null]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ── AGENT TRACKER ──────────────────────────────────────────────

// GET /api/user/tracker — get agent's tracker totals + today
router.get('/tracker', requireAuth, requireRole('agent'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayRes = await pool.query('SELECT doors, contacts, appointments, viewings, offers FROM agent_tracker WHERE user_id = $1 AND date = $2', [req.user.id, today]);
    const totalsRes = await pool.query('SELECT COALESCE(SUM(doors),0) as doors, COALESCE(SUM(contacts),0) as contacts, COALESCE(SUM(appointments),0) as appointments, COALESCE(SUM(viewings),0) as viewings, COALESCE(SUM(offers),0) as offers FROM agent_tracker WHERE user_id = $1', [req.user.id]);
    res.json({
      today: todayRes.rows[0] || { doors: 0, contacts: 0, appointments: 0, viewings: 0, offers: 0 },
      totals: totalsRes.rows[0]
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/user/tracker — save today's numbers
router.post('/tracker', requireAuth, requireRole('agent'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { doors, contacts, appointments, viewings, offers } = req.body;
    await pool.query(`
      INSERT INTO agent_tracker (user_id, date, doors, contacts, appointments, viewings, offers)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT(user_id, date) DO UPDATE SET
        doors = EXCLUDED.doors, contacts = EXCLUDED.contacts,
        appointments = EXCLUDED.appointments, viewings = EXCLUDED.viewings, offers = EXCLUDED.offers
    `, [req.user.id, today, doors || 0, contacts || 0, appointments || 0, viewings || 0, offers || 0]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/user/tracker/:id — DC views agent tracker totals
router.get('/tracker/:id', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const agentId = parseInt(req.params.id);
    const totalsRes = await pool.query('SELECT COALESCE(SUM(doors),0) as doors, COALESCE(SUM(contacts),0) as contacts, COALESCE(SUM(appointments),0) as appointments, COALESCE(SUM(viewings),0) as viewings, COALESCE(SUM(offers),0) as offers FROM agent_tracker WHERE user_id = $1', [agentId]);
    res.json({ totals: totalsRes.rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ── DC PROGRESS ────────────────────────────────────────────────

// GET /api/user/dc-progress
router.get('/dc-progress', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT week_index, task_index, completed FROM dc_progress WHERE user_id = $1', [req.user.id]);
    const progress = {};
    rows.forEach(r => { progress[`${r.week_index}-${r.task_index}`] = !!r.completed; });
    res.json({ progress });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/user/dc-progress
router.post('/dc-progress', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const { week_index, task_index, completed } = req.body;
    await pool.query(`
      INSERT INTO dc_progress (user_id, week_index, task_index, completed, completed_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT(user_id, week_index, task_index) DO UPDATE SET
        completed = EXCLUDED.completed,
        completed_at = EXCLUDED.completed_at
    `, [req.user.id, week_index, task_index, completed ? 1 : 0, completed ? new Date().toISOString() : null]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/user/dc-prompt — save DC morning prompt
router.post('/dc-prompt', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const { date, focus_answer, win_answer } = req.body;
    await pool.query('INSERT INTO dc_prompts (user_id, date, focus_answer, win_answer) VALUES ($1, $2, $3, $4)',
      [req.user.id, date, focus_answer || null, win_answer || null]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ── USER MANAGEMENT ───────────────────────────────────────────

// GET /api/user/all-users — dc and admin
router.get('/all-users', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, role, name, created_at FROM users ORDER BY created_at');
    res.json({ users: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/user/create — dc/admin creates a new user
router.post('/create', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const { username, password, role, name } = req.body;
    if (!username || !password || !role || !name) return res.status(400).json({ error: 'All fields required' });
    if (!['agent', 'dc'].includes(role)) return res.status(400).json({ error: 'Role must be agent or dc' });

    const hash = bcrypt.hashSync(password, 10);
    const { rows } = await pool.query('INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4) RETURNING id',
      [username.toLowerCase().trim(), hash, role, name]);
    res.json({ ok: true, id: rows[0].id });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    console.error(e); res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/user/:id — dc/admin deletes a user
router.delete('/:id', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await pool.query('DELETE FROM agent_progress WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM agent_state WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM dc_progress WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM checkins WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM dc_agent_tasks WHERE dc_user_id = $1 OR agent_id = $1', [id]);
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/user/:id/reset-password — dc/admin resets password
router.post('/:id/reset-password', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const hash = bcrypt.hashSync(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/user/agent-overview — DC sees all agents progress summary
router.get('/agent-overview', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const { rows: agents } = await pool.query("SELECT id, name, username, created_at FROM users WHERE role = 'agent'");
    const result = await Promise.all(agents.map(async (agent) => {
      const stateRes = await pool.query('SELECT committed, current_week FROM agent_state WHERE user_id = $1', [agent.id]);
      const state = stateRes.rows[0];
      const completedRes = await pool.query('SELECT COUNT(*) as count FROM agent_progress WHERE user_id = $1 AND completed = 1', [agent.id]);
      const totalCheckinsRes = await pool.query('SELECT COUNT(*) as count FROM checkins WHERE user_id = $1', [agent.id]);
      const completedCheckinsRes = await pool.query('SELECT COUNT(*) as count FROM checkins WHERE user_id = $1 AND evening_done = 1', [agent.id]);
      const lastCheckinRes = await pool.query('SELECT date, evening_done, morning_answer FROM checkins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [agent.id]);
      const progressRes = await pool.query('SELECT week_index, task_index, completed FROM agent_progress WHERE user_id = $1', [agent.id]);
      const weekProgress = {};
      progressRes.rows.forEach(r => {
        if (!weekProgress[r.week_index]) weekProgress[r.week_index] = { done: 0, total: 0 };
        weekProgress[r.week_index].total++;
        if (r.completed) weekProgress[r.week_index].done++;
      });
      return {
        id: agent.id, name: agent.name, username: agent.username, created_at: agent.created_at,
        committed: state?.committed || 0, current_week: state?.current_week || 0,
        completed_tasks: parseInt(completedRes.rows[0]?.count) || 0,
        total_checkins: parseInt(totalCheckinsRes.rows[0]?.count) || 0,
        completed_checkins: parseInt(completedCheckinsRes.rows[0]?.count) || 0,
        last_checkin: lastCheckinRes.rows[0] || null,
        week_progress: weekProgress
      };
    }));
    res.json({ agents: result });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/user/agent/:id/dc-tasks — DC's own checklist for this agent
router.get('/agent/:id/dc-tasks', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const agentId = parseInt(req.params.id);
    const { rows } = await pool.query('SELECT week_index, task_index, completed FROM dc_agent_tasks WHERE dc_user_id = $1 AND agent_id = $2', [req.user.id, agentId]);
    const progress = {};
    rows.forEach(r => { progress[`${r.week_index}-${r.task_index}`] = !!r.completed; });
    res.json({ progress });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/user/agent/:id/dc-tasks — toggle a DC task for this agent
router.post('/agent/:id/dc-tasks', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const agentId = parseInt(req.params.id);
    const { week_index, task_index, completed } = req.body;
    await pool.query(`
      INSERT INTO dc_agent_tasks (dc_user_id, agent_id, week_index, task_index, completed, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT(dc_user_id, agent_id, week_index, task_index) DO UPDATE SET
        completed = EXCLUDED.completed,
        completed_at = EXCLUDED.completed_at
    `, [req.user.id, agentId, week_index, task_index, completed ? 1 : 0, completed ? new Date().toISOString() : null]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/user/agent/:id/profile — DC/Admin sees full agent progress
router.get('/agent/:id/profile', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const agentId = parseInt(req.params.id);
    const agentRes = await pool.query("SELECT id, name, username, created_at FROM users WHERE id = $1 AND role = 'agent'", [agentId]);
    const agent = agentRes.rows[0];
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const stateRes = await pool.query('SELECT committed, current_week FROM agent_state WHERE user_id = $1', [agentId]);
    const state = stateRes.rows[0];

    const progressRes = await pool.query('SELECT week_index, task_index, completed FROM agent_progress WHERE user_id = $1', [agentId]);
    const progress = {};
    progressRes.rows.forEach(r => { progress[`${r.week_index}-${r.task_index}`] = !!r.completed; });

    const checkinsRes = await pool.query('SELECT date, morning_answer, evening_done, evening_note FROM checkins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 90', [agentId]);

    res.json({
      agent: { ...agent, committed: state?.committed || 0, current_week: state?.current_week || 0 },
      progress,
      checkins: checkinsRes.rows
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

export default router;

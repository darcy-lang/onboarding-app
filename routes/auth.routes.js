import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { generateToken, requireAuth } from '../auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase().trim()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

    const token = generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ user: { id: user.id, username: user.username, role: user.role, name: user.name, created_at: user.created_at } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT created_at FROM users WHERE id = $1', [req.user.id]);
    res.json({ user: { ...req.user, created_at: rows[0]?.created_at } });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

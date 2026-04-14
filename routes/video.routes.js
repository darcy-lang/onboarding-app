import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_IDS = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'];

const uploadsDir = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.body.video_id}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  }
});

const router = Router();

// GET /api/videos — all video URLs
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT video_id, file_path FROM videos');
    const videos = {};
    VALID_IDS.forEach(id => { videos[id] = null; });
    rows.forEach(r => { videos[r.video_id] = r.file_path; });
    res.json({ videos });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/videos/upload — upload a video file
router.post('/upload', requireAuth, requireRole('dc', 'admin'), upload.single('file'), async (req, res) => {
  try {
    const { video_id } = req.body;
    if (!video_id || !VALID_IDS.includes(video_id)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid video_id' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const existingRes = await pool.query('SELECT file_path FROM videos WHERE video_id = $1', [video_id]);
    if (existingRes.rows[0]) {
      const oldPath = path.join(__dirname, '..', existingRes.rows[0].file_path);
      try { fs.unlinkSync(oldPath); } catch {}
    }

    const filePath = `/uploads/${req.file.filename}`;
    await pool.query(`
      INSERT INTO videos (video_id, file_path, original_name, uploaded_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(video_id) DO UPDATE SET file_path = EXCLUDED.file_path, original_name = EXCLUDED.original_name, uploaded_by = EXCLUDED.uploaded_by
    `, [video_id, filePath, req.file.originalname, req.user.id]);

    res.json({ ok: true, video_id, url: filePath });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/videos/loom — save a Loom URL
router.post('/loom', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const { video_id, loom_url } = req.body;
    if (!video_id || !VALID_IDS.includes(video_id)) return res.status(400).json({ error: 'Invalid video_id' });
    if (!loom_url) return res.status(400).json({ error: 'No Loom URL provided' });

    const existingRes = await pool.query('SELECT file_path FROM videos WHERE video_id = $1', [video_id]);
    if (existingRes.rows[0]?.file_path?.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', existingRes.rows[0].file_path);
      try { fs.unlinkSync(oldPath); } catch {}
    }

    await pool.query(`
      INSERT INTO videos (video_id, file_path, original_name, uploaded_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(video_id) DO UPDATE SET file_path = EXCLUDED.file_path, original_name = EXCLUDED.original_name, uploaded_by = EXCLUDED.uploaded_by
    `, [video_id, loom_url, 'loom', req.user.id]);

    res.json({ ok: true, video_id, url: loom_url });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/videos/training — get all training video Loom URLs
router.get('/training', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT video_id, loom_url FROM training_videos');
    const videos = {};
    rows.forEach(r => { videos[r.video_id] = r.loom_url; });
    res.json({ videos });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/videos/training — DC saves a Loom URL for a training video
router.post('/training', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    const { video_id, loom_url } = req.body;
    if (!video_id) return res.status(400).json({ error: 'Invalid video_id' });
    if (!loom_url) return res.status(400).json({ error: 'No Loom URL provided' });
    await pool.query(`
      INSERT INTO training_videos (video_id, loom_url, added_by)
      VALUES ($1, $2, $3)
      ON CONFLICT(video_id) DO UPDATE SET loom_url = EXCLUDED.loom_url, added_by = EXCLUDED.added_by
    `, [video_id, loom_url, req.user.id]);
    res.json({ ok: true, video_id, loom_url });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/videos/training/:id — DC removes a training video
router.delete('/training/:id', requireAuth, requireRole('dc', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM training_videos WHERE video_id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

export default router;

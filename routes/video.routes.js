import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';
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
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT video_id, file_path FROM videos').all();
  const videos = {};
  VALID_IDS.forEach(id => { videos[id] = null; });
  rows.forEach(r => { videos[r.video_id] = r.file_path; });
  res.json({ videos });
});

// POST /api/videos/upload — upload a video file
router.post('/upload', requireAuth, requireRole('dc', 'admin'), upload.single('file'), (req, res) => {
  const { video_id } = req.body;
  if (!video_id || !VALID_IDS.includes(video_id)) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid video_id' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Delete old file if exists
  const existing = db.prepare('SELECT file_path FROM videos WHERE video_id = ?').get(video_id);
  if (existing) {
    const oldPath = path.join(__dirname, '..', existing.file_path);
    try { fs.unlinkSync(oldPath); } catch {}
  }

  const filePath = `/uploads/${req.file.filename}`;
  db.prepare(`
    INSERT OR REPLACE INTO videos (video_id, file_path, original_name, uploaded_by)
    VALUES (?, ?, ?, ?)
  `).run(video_id, filePath, req.file.originalname, req.user.id);

  res.json({ ok: true, video_id, url: filePath });
});

export default router;

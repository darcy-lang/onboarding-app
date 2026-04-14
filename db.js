import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('onboarding.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('agent', 'dc', 'admin')),
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agent_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    week_index INTEGER NOT NULL,
    task_index INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, week_index, task_index)
  );

  CREATE TABLE IF NOT EXISTS agent_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    committed INTEGER DEFAULT 0,
    current_week INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    morning_answer TEXT,
    evening_done INTEGER,
    evening_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS dc_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    focus_answer TEXT,
    win_answer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS dc_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    week_index INTEGER NOT NULL,
    task_index INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, week_index, task_index)
  );

  CREATE TABLE IF NOT EXISTS dc_agent_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dc_user_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    week_index INTEGER NOT NULL,
    task_index INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at DATETIME,
    FOREIGN KEY (dc_user_id) REFERENCES users(id),
    FOREIGN KEY (agent_id) REFERENCES users(id),
    UNIQUE(dc_user_id, agent_id, week_index, task_index)
  );

  CREATE TABLE IF NOT EXISTS training_videos (
    video_id TEXT PRIMARY KEY,
    loom_url TEXT NOT NULL,
    added_by INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS videos (
    video_id TEXT PRIMARY KEY CHECK(video_id IN ('v1','v2','v3','v4','v5','v6','v7','v8')),
    file_path TEXT NOT NULL,
    original_name TEXT,
    uploaded_by INTEGER NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
  );
`);

// Seed default users if none exist
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  const adminHash = bcrypt.hashSync('admin2024', 10);
  const dcHash = bcrypt.hashSync('director2024', 10);
  const agent1Hash = bcrypt.hashSync('agent2024', 10);

  db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run('darcy', adminHash, 'admin', 'Darcy');
  db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run('director', dcHash, 'dc', 'Director Comercial');
  db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run('agent1', agent1Hash, 'agent', 'Agent 1');

  console.log('Default users created:');
  console.log('   Admin:    username=darcy      password=admin2024');
  console.log('   Director: username=director   password=director2024');
  console.log('   Agent 1:  username=agent1     password=agent2024');
}

export default db;

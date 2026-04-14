import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false
});

// Initialize database
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('agent', 'dc', 'admin')),
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS agent_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      week_index INTEGER NOT NULL,
      task_index INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TIMESTAMP,
      UNIQUE(user_id, week_index, task_index)
    );

    CREATE TABLE IF NOT EXISTS agent_state (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
      committed INTEGER DEFAULT 0,
      current_week INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      morning_answer TEXT,
      evening_done INTEGER,
      evening_note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dc_prompts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      focus_answer TEXT,
      win_answer TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dc_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      week_index INTEGER NOT NULL,
      task_index INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TIMESTAMP,
      UNIQUE(user_id, week_index, task_index)
    );

    CREATE TABLE IF NOT EXISTS dc_agent_tasks (
      id SERIAL PRIMARY KEY,
      dc_user_id INTEGER NOT NULL REFERENCES users(id),
      agent_id INTEGER NOT NULL REFERENCES users(id),
      week_index INTEGER NOT NULL,
      task_index INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TIMESTAMP,
      UNIQUE(dc_user_id, agent_id, week_index, task_index)
    );

    CREATE TABLE IF NOT EXISTS training_videos (
      video_id TEXT PRIMARY KEY,
      loom_url TEXT NOT NULL,
      added_by INTEGER NOT NULL REFERENCES users(id),
      added_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS agent_tracker (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      doors INTEGER DEFAULT 0,
      contacts INTEGER DEFAULT 0,
      appointments INTEGER DEFAULT 0,
      viewings INTEGER DEFAULT 0,
      offers INTEGER DEFAULT 0,
      listings INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS videos (
      video_id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      original_name TEXT,
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      uploaded_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Add listings column if missing (migration for existing databases)
  try {
    await pool.query('ALTER TABLE agent_tracker ADD COLUMN IF NOT EXISTS listings INTEGER DEFAULT 0');
  } catch (e) { /* column already exists */ }

  // Seed default users if none exist
  const { rows } = await pool.query('SELECT COUNT(*) as count FROM users');
  if (parseInt(rows[0].count) === 0) {
    const adminHash = bcrypt.hashSync('admin2024', 10);
    const dcHash = bcrypt.hashSync('director2024', 10);
    const agent1Hash = bcrypt.hashSync('agent2024', 10);

    await pool.query('INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)', ['darcy', adminHash, 'admin', 'Darcy']);
    await pool.query('INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)', ['director', dcHash, 'dc', 'Director Comercial']);
    await pool.query('INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)', ['agent1', agent1Hash, 'agent', 'Agent 1']);

    console.log('Default users created:');
    console.log('   Admin:    username=darcy      password=admin2024');
    console.log('   Director: username=director   password=director2024');
    console.log('   Agent 1:  username=agent1     password=agent2024');
  }
}

export { pool, initDb };
export default pool;

const pool = require('./config/db');
const bcrypt = require('bcrypt');

async function run() {
  try {
    console.log('Running migration...');
    // Add column if it doesn't exist (MySQL catch if exists)
    try {
      await pool.query('ALTER TABLE users ADD COLUMN faculty_id INT NULL UNIQUE');
      await pool.query('ALTER TABLE users ADD FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE');
      console.log('Added faculty_id to users.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('faculty_id already exists on users.');
      } else {
        throw e;
      }
    }
    
    // Ensure all current faculties have user accounts
    const [faculties] = await pool.query('SELECT * FROM faculty');
    for (const f of faculties) {
      const username = f.full_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const hash = await bcrypt.hash('faculty123', 10);
      try {
        await pool.query('INSERT INTO users (username, password_hash, role, faculty_id) VALUES (?, ?, ?, ?)', [username, hash, 'viewer', f.id]);
        console.log(`Created account for ${username}`);
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

run();

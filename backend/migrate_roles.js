const pool = require('./config/db');
const bcrypt = require('bcrypt');

async function migrate() {
  try {
    // Extend the role ENUM to include new roles
    await pool.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('admin','viewer','program_head','program_assistant') NOT NULL DEFAULT 'viewer'
    `);
    console.log('✅ Role ENUM extended successfully.');

    // Seed a Program Head account (if not already exists)
    const [existing] = await pool.query(`SELECT id FROM users WHERE username IN ('prog_head','prog_assistant')`);
    if (existing.length === 0) {
      const hash = await bcrypt.hash('schedule123', 10);
      await pool.query(
        `INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?), (?, ?, ?)`,
        ['prog_head', hash, 'program_head', 'prog_assistant', hash, 'program_assistant']
      );
      console.log('✅ Demo accounts created:');
      console.log('   username: prog_head      | password: schedule123 | role: program_head');
      console.log('   username: prog_assistant  | password: schedule123 | role: program_assistant');
    } else {
      console.log('ℹ️  Demo accounts already exist, skipping seed.');
    }

    console.log('\n✅ Role migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();

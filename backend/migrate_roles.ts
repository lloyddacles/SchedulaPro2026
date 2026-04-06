import pool from './config/db.ts';
import bcrypt from 'bcryptjs';

async function migrate() {
  try {
    // Extend the role ENUM to include all valid roles
    console.log('🔄 Extending role ENUM...');
    await pool.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('admin', 'viewer', 'program_head', 'program_assistant', 'faculty') NOT NULL DEFAULT 'faculty'
    `);
    console.log('✅ Role ENUM extended successfully.');

    // Seed a Program Head account (if not already exists)
    console.log('🔄 Checking for demo accounts...');
    const [existing] = (await pool.query(`SELECT id FROM users WHERE username IN ('prog_head','prog_assistant')`)) as any;
    
    if (existing && existing.length === 0) {
      const hash = await bcrypt.hash('schedule123', 10);
      await pool.query(
        `INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?), (?, ?, ?)`,
        ['prog_head', hash, 'program_head', 'prog_assistant', hash, 'program_assistant']
      );
      console.log('✅ Demo accounts created:');
      console.log('   username: prog_head      | password: schedule123 | role: program_head');
      console.log('   username: prog_assistant  | password: schedule123 | role: program_assistant');
    } else {
      console.log('ℹ️  Demo accounts already exist or skipped.');
    }

    console.log('\n✅ Role migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();

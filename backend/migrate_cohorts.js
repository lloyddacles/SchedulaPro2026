const pool = require('./config/db');

async function migrateCohorts() {
  try {
    console.log('Creating programs table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS programs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        type ENUM('College', 'SHS', 'JHS', 'Other') DEFAULT 'College',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating sections table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        program_id INT NOT NULL,
        year_level INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
      )
    `);

    console.log('Inserting default program and section...');
    await pool.query(`INSERT IGNORE INTO programs (id, code, name, type) VALUES (1, 'DEFAULT', 'Unassigned Program', 'Other')`);
    await pool.query(`INSERT IGNORE INTO sections (id, program_id, year_level, name) VALUES (1, 1, 1, 'Unassigned Section')`);

    console.log('Altering teaching_loads table to include section_id...');
    try {
      await pool.query('ALTER TABLE teaching_loads ADD COLUMN section_id INT NOT NULL DEFAULT 1');
      await pool.query('ALTER TABLE teaching_loads ADD FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE');
      console.log('Successfully linked teaching_loads to sections.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
         console.log('section_id already exists on teaching_loads.');
      } else {
         throw e;
      }
    }
    
    console.log('Migration complete.');
    process.exit();
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
migrateCohorts();

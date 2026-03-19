const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Creating rooms table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        type ENUM('Lecture', 'Laboratory', 'Field') NOT NULL DEFAULT 'Lecture',
        capacity INT DEFAULT 40,
        notes TEXT
      )
    `);

    console.log('Adding room_type to subjects...');
    try {
        await pool.query("ALTER TABLE subjects ADD COLUMN room_type ENUM('Lecture', 'Laboratory', 'Field', 'Any') NOT NULL DEFAULT 'Any'");
    } catch(e) {
        if (e.code === 'ER_DUP_FIELDNAME') console.log('room_type column already exists.');
        else throw e;
    }

    console.log('Inserting default rooms...');
    await pool.query("INSERT IGNORE INTO rooms (name, type, capacity) VALUES ('Room 101', 'Lecture', 50), ('Comp Lab A', 'Laboratory', 35), ('Gymnasium', 'Field', 200)");

    console.log('Migration complete.');
    process.exit();
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

migrate();

const pool = require('./config/db');

async function migrate() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting Faculty Program Migration...');
    await connection.beginTransaction();

    // 1. Add program_id column
    console.log('Adding program_id column to faculty...');
    try {
      await connection.query('ALTER TABLE faculty ADD COLUMN program_id INT NOT NULL DEFAULT 1');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column program_id already exists.');
      } else {
        throw e;
      }
    }

    // 2. Map existing department strings to program_ids
    console.log('Mapping departments to program_ids...');
    const mappings = {
      'BSA': 4,
      'BSAIS': 6,
      'BSCRIM': 12,
      'BSE': 3,
      'BSIS': 2,
      'BSTM': 5,
      'CS': 2,
      'SHS': 8
    };

    for (const [dept, progId] of Object.entries(mappings)) {
      await connection.query('UPDATE faculty SET program_id = ? WHERE department = ?', [progId, dept]);
    }

    // 3. Add Foreign Key constraint
    console.log('Adding foreign key constraint...');
    try {
      await connection.query('ALTER TABLE faculty ADD CONSTRAINT faculty_ibfk_1 FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT');
    } catch (e) {
      if (e.code === 'ER_FK_DUP_NAME' || e.code === 'ER_DUP_CONSTRAINT_NAME') {
        console.log('Foreign key constraint already exists.');
      } else {
        throw e;
      }
    }

    await connection.commit();
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

migrate();

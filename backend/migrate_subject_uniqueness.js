const pool = require('./config/db');

async function migrate() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting Subject Uniqueness Migration...');
    await connection.beginTransaction();

    // 1. Drop existing Foreign Key and old global unique index
    console.log('Dropping constraints...');
    try {
      await connection.query('ALTER TABLE subjects DROP FOREIGN KEY subjects_ibfk_1');
    } catch (e) {
      console.log('Foreign key subjects_ibfk_1 not found.');
    }
    
    try {
      await connection.query('ALTER TABLE subjects DROP INDEX subject_code');
    } catch (e) {
      console.log('Existing index subject_code not found or already dropped.');
    }

    // 2. Ensure all subjects have a program_id (map NULL to 1)
    console.log('Mapping NULL program_ids to 1 (General)...');
    await connection.query('UPDATE subjects SET program_id = 1 WHERE program_id IS NULL');

    // 3. Make program_id NOT NULL with default 1
    console.log('Modifying program_id column...');
    await connection.query('ALTER TABLE subjects MODIFY program_id INT NOT NULL DEFAULT 1');

    // 4. Add the new composite unique indices
    console.log('Adding composite unique indices...');
    try {
      await connection.query('ALTER TABLE subjects ADD UNIQUE INDEX idx_subject_code_program (subject_code, program_id)');
      await connection.query('ALTER TABLE subjects ADD UNIQUE INDEX idx_subject_name_program (subject_name, program_id)');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('Composite indices already exist.');
      } else {
        throw e;
      }
    }

    // 5. Re-add the Foreign Key (now with RESTRICT or CASCADE since NOT NULL)
    console.log('Re-adding foreign key...');
    await connection.query('ALTER TABLE subjects ADD CONSTRAINT subjects_ibfk_1 FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT');

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

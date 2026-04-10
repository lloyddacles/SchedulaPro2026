const mysql = require('mysql2/promise');
require('dotenv').config();

async function patch() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  });

  console.log('🚀 Starting Personnel Hierarchy Patch...');

  try {
    // 1. Add department_id to faculty if it doesn't exist
    console.log('--- Updating Faculty Table ---');
    const [facultyCols] = await connection.query('SHOW COLUMNS FROM faculty');
    if (!facultyCols.find(c => c.Field === 'department_id')) {
      await connection.query('ALTER TABLE faculty ADD COLUMN department_id INT NULL AFTER full_name');
      await connection.query('ALTER TABLE faculty ADD CONSTRAINT fk_faculty_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL');
      console.log('✅ Added department_id to faculty table.');
    }

    // 2. Add department_id to rooms table
    console.log('--- Updating Rooms Table ---');
    const [roomCols] = await connection.query('SHOW COLUMNS FROM rooms');
    if (!roomCols.find(c => c.Field === 'department_id')) {
      await connection.query('ALTER TABLE rooms ADD COLUMN department_id INT NULL AFTER capacity');
      await connection.query('ALTER TABLE rooms ADD CONSTRAINT fk_rooms_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL');
      console.log('✅ Added department_id to rooms table.');
    }

    // 3. Data Migration for Faculty
    console.log('--- Migrating Faculty Data ---');
    const [departments] = await connection.query('SELECT id, code, name FROM departments');
    
    // Check if we already renamed it or not
    const [fCols] = await connection.query('SHOW COLUMNS FROM faculty');
    const deptColName = fCols.find(c => c.Field === 'department') ? 'department' : (fCols.find(c => c.Field === 'old_department_string') ? 'old_department_string' : null);

    if (deptColName) {
      const [faculty] = await connection.query(`SELECT id, ${deptColName} AS dept_str FROM faculty WHERE ${deptColName} IS NOT NULL AND ${deptColName} != ''`);

      for (const fac of faculty) {
        const match = departments.find(d => 
          (fac.dept_str && (fac.dept_str.toLowerCase().includes(d.code.toLowerCase()) || 
          d.name.toLowerCase().includes(fac.dept_str.toLowerCase()) ||
          fac.dept_str.toLowerCase().includes(d.name.toLowerCase())))
        );

        if (match) {
          await connection.query('UPDATE faculty SET department_id = ? WHERE id = ?', [match.id, fac.id]);
          console.log(`🔗 Auto-mapped ${fac.dept_str} to ${match.name} for faculty ID ${fac.id}`);
        }
      }

      // 4. Archive the old department string column
      if (deptColName === 'department') {
        await connection.query('ALTER TABLE faculty CHANGE department old_department_string VARCHAR(255)');
        console.log('⚠️ Renamed faculty.department to old_department_string (Archive).');
      }
    } else {
      console.log('ℹ️ No old department string column found to migrate.');
    }

    console.log('✨ Personnel Hierarchy Patch Completed Successfully!');

  } catch (err) {
    console.error('❌ Patch failed:', err.message);
  } finally {
    await connection.end();
  }
}

patch();

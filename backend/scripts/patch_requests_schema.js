import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function patch() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL || {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log(" [PATCH]: Auditing institutional schedule_requests schema...");

    // 1. Expand the ENUM to include MAKEUP and others
    await connection.query(`
      ALTER TABLE schedule_requests 
      MODIFY COLUMN request_type ENUM('DROP', 'SWAP', 'CHANGE_ROOM', 'CHANGE_TIME', 'OTHER', 'MAKEUP') NOT NULL
    `);
    console.log(" [SUCCESS]: Expanded request_type ENUM boundaries.");

    // 2. Add missing columns with safer IF NOT EXISTS logic (manual check)
    const [cols] = await connection.query("SHOW COLUMNS FROM schedule_requests");
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('reason_text') && colNames.includes('reason')) {
      await connection.query("ALTER TABLE schedule_requests CHANGE COLUMN reason reason_text TEXT NOT NULL");
      console.log(" [SUCCESS]: Standardized column nomenclature (reason -> reason_text).");
    } else if (!colNames.includes('reason_text')) {
       await connection.query("ALTER TABLE schedule_requests ADD COLUMN reason_text TEXT NOT NULL AFTER request_type");
       console.log(" [SUCCESS]: Added missing reason_text boundary.");
    }

    const newCols = [
      { name: 'target_day', type: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'target_start_time', type: 'TIME DEFAULT NULL' },
      { name: 'target_end_time', type: 'TIME DEFAULT NULL' },
      { name: 'target_room', type: 'VARCHAR(50) DEFAULT NULL' },
      { name: 'is_recurring', type: 'BOOLEAN DEFAULT 1' },
      { name: 'event_date', type: 'DATE DEFAULT NULL' }
    ];

    for (const col of newCols) {
      if (!colNames.includes(col.name)) {
        await connection.query(`ALTER TABLE schedule_requests ADD COLUMN ${col.name} ${col.type}`);
        console.log(` [SUCCESS]: Injected column: ${col.name}`);
      }
    }

    console.log(" [PATCH COMPLETE]: institutional schedule_requests table synchronized with Wizard requirements.");
  } catch (err) {
    console.error(" [PATCH FAILED]:", err);
  } finally {
    await connection.end();
  }
}

patch();

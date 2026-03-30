const pool = require('./config/db');

async function addColumnIfMissing(columnName, alterSQL) {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teaching_loads' AND COLUMN_NAME = ?`,
    [columnName]
  );
  if (cols.length === 0) {
    await pool.query(alterSQL);
    console.log(`  ✅ Added column: ${columnName}`);
  } else {
    console.log(`  ⏭  Column already exists: ${columnName}`);
  }
}

async function migrate() {
  try {
    await addColumnIfMissing('status',
      `ALTER TABLE teaching_loads ADD COLUMN status ENUM('draft','pending_review','approved','rejected') NOT NULL DEFAULT 'draft'`
    );
    await addColumnIfMissing('review_notes',
      `ALTER TABLE teaching_loads ADD COLUMN review_notes TEXT NULL`
    );
    await addColumnIfMissing('reviewed_by',
      `ALTER TABLE teaching_loads ADD COLUMN reviewed_by INT NULL`
    );
    await addColumnIfMissing('reviewed_at',
      `ALTER TABLE teaching_loads ADD COLUMN reviewed_at DATETIME NULL`
    );

    // Grandfather existing loads — mark as approved so faculty can still see schedules
    const [result] = await pool.query(
      `UPDATE teaching_loads SET status = 'approved' WHERE status = 'draft'`
    );
    console.log(`✅ Grandfathered ${result.affectedRows} existing loads → approved`);

    console.log('\n✅ Load status migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

// Only the schema is shipped. Never copy a developer's database into userData.
function initializeStorage(dataDir, schemaDir) {
  fs.mkdirSync(path.join(dataDir, 'uploads', 'pdfs'), { recursive: true });
  const dbPath = path.join(dataDir, 'paper-manager.db');
  const db = new DatabaseSync(dbPath);
  try {
    db.exec('PRAGMA busy_timeout = 5000');
    db.exec('BEGIN IMMEDIATE');
    try {
      const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Paper'").get();
      if (!exists) {
        const sql = fs.readFileSync(path.join(schemaDir, 'migrations', '20260217112344_init', 'migration.sql'), 'utf8');
        db.exec(sql);
      }
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    // A pre-existing database is validated and preserved without replacing rows.
    db.prepare('SELECT id, title, abstract, authors, journal, year, pdfPath, createdAt, updatedAt FROM Paper LIMIT 1').all();
  } finally { db.close(); }
  return { dbPath, databaseUrl: `file:${dbPath.replaceAll('\\', '/')}`, dataDir };
}
function selectDataDirectory(appData) {
  const current = path.join(appData, 'Paper Manager');
  const legacy = path.join(appData, 'paper-manager');
  // Earlier packages may have used package.name as the userData directory.
  // Reuse it rather than showing an empty library after an upgrade.
  if (!fs.existsSync(path.join(current, 'paper-manager.db')) && fs.existsSync(path.join(legacy, 'paper-manager.db'))) return legacy;
  return current;
}
module.exports = { initializeStorage, selectDataDirectory };

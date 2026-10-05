// Usage: node scripts/import-legacy.cjs <old.db> <old-pdf-directory> <new-data-directory>
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync, backup } = require('node:sqlite');
const { initializeStorage } = require('../main/storage.cjs');

async function importLegacy(sourceFile, sourcePdfs, destination) {
  const target = path.resolve(destination);
  if (fs.existsSync(target) && fs.readdirSync(target).length) throw new Error('移行先は空のディレクトリを指定してください。既存データは上書きしません。');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const staging = fs.mkdtempSync(`${target}.import-`);
  let db;
  try {
    db = new DatabaseSync(path.resolve(sourceFile), { readOnly: true });
    const papers = db.prepare('SELECT pdfPath FROM Paper').all();
    fs.mkdirSync(path.join(staging, 'uploads', 'pdfs'), { recursive: true });
    for (const paper of papers) {
      if (!paper.pdfPath) continue;
      const prefix = '/uploads/pdfs/';
      const filename = paper.pdfPath.slice(prefix.length);
      if (!paper.pdfPath.startsWith(prefix) || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/i.test(filename)) throw new Error(`非対応の PDF パス: ${paper.pdfPath}`);
      fs.copyFileSync(path.join(path.resolve(sourcePdfs), filename), path.join(staging, 'uploads', 'pdfs', filename));
    }
    // SQLite online backup includes committed data from WAL/journal safely.
    await backup(db, path.join(staging, 'paper-manager.db'));
    initializeStorage(staging, path.resolve(__dirname, '../prisma'));
    if (fs.existsSync(target)) fs.rmdirSync(target); // verified empty above; fails if another process added data
    fs.renameSync(staging, target);
  } finally {
    if (db) db.close();
    if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
  }
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 3) { console.error('Usage: node scripts/import-legacy.cjs <old.db> <old-pdf-directory> <new-data-directory>'); process.exitCode = 1; }
  else importLegacy(...args).then(() => console.log('移行完了。元データは変更していません。')).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { importLegacy };

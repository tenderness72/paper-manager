const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { initializeStorage } = require('../main/storage.cjs');

test('first launch creates schema and PDF directory; repeated launch preserves data', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paper manager-'));
  try {
    const storage = initializeStorage(dir, path.resolve('prisma'));
    assert.ok(fs.statSync(path.join(dir, 'uploads', 'pdfs')).isDirectory());
    const db = new DatabaseSync(storage.dbPath);
    db.prepare('INSERT INTO Paper (title, updatedAt) VALUES (?, ?)').run('Existing paper', Date.now());
    db.close();
    initializeStorage(dir, path.resolve('prisma'));
    const reopened = new DatabaseSync(storage.dbPath);
    assert.equal(reopened.prepare('SELECT title FROM Paper').get().title, 'Existing paper');
    reopened.close();
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('invalid existing database fails without replacing the file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-invalid-'));
  try {
    const file = path.join(dir, 'paper-manager.db');
    fs.writeFileSync(file, 'not a database');
    assert.throws(() => initializeStorage(dir, path.resolve('prisma')));
    assert.equal(fs.readFileSync(file, 'utf8'), 'not a database');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('RIS parser supports CRLF, multiple authors, year and multiple records', () => {
  const ts = require('typescript');
  const Module = require('node:module');
  const compiled = ts.transpileModule(fs.readFileSync('lib/risParser.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = new Module(path.resolve('lib/risParser.ts'));
  mod._compile(compiled, path.resolve('lib/risParser.ts'));
  const entries = mod.exports.parseRISFile('TY  - JOUR\r\nTI  - First\r\nAU  - Alice\r\nAU  - Bob\r\nPY  - 2024\r\nER  -\r\nTY  - JOUR\r\nTI  - Second\r\nER  -');
  assert.equal(entries.length, 2);
  assert.deepEqual(mod.exports.risEntryToPaper(entries[0]), { title: 'First', abstract: null, authors: 'Alice, Bob', journal: null, year: 2024 });
});


test('legacy import preserves database and shared PDFs without overwriting destination', async () => {
  const { importLegacy } = require('../scripts/import-legacy.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-import-'));
  try {
    const old = initializeStorage(path.join(root, 'old'), path.resolve('prisma'));
    const db = new DatabaseSync(old.dbPath);
    db.prepare('INSERT INTO Paper (title, pdfPath, updatedAt) VALUES (?, ?, ?)').run('Legacy', '/uploads/pdfs/123-old.pdf', Date.now());
    db.close();
    fs.writeFileSync(path.join(old.dataDir, 'uploads', 'pdfs', '123-old.pdf'), '%PDF-1.4 old');
    const target = path.join(root, 'new');
    await importLegacy(old.dbPath, path.join(old.dataDir, 'uploads', 'pdfs'), target);
    const migrated = new DatabaseSync(path.join(target, 'paper-manager.db'));
    assert.equal(migrated.prepare('SELECT title FROM Paper').get().title, 'Legacy');
    migrated.close();
    assert.equal(fs.readFileSync(path.join(target, 'uploads', 'pdfs', '123-old.pdf'), 'utf8'), '%PDF-1.4 old');
    await assert.rejects(importLegacy(old.dbPath, path.join(old.dataDir, 'uploads', 'pdfs'), target), /上書き/);
    assert.ok(fs.existsSync(old.dbPath));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});


test('packaged upgrades reuse legacy userData, preferring the current database when both exist', () => {
  const { selectDataDirectory } = require('../main/storage.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-userdata-'));
  try {
    assert.equal(selectDataDirectory(root), path.join(root, 'Paper Manager'));
    initializeStorage(path.join(root, 'paper-manager'), path.resolve('prisma'));
    assert.equal(selectDataDirectory(root), path.join(root, 'paper-manager'));
    initializeStorage(path.join(root, 'Paper Manager'), path.resolve('prisma'));
    assert.equal(selectDataDirectory(root), path.join(root, 'Paper Manager'));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

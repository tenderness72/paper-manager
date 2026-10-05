const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { initializeStorage } = require('../main/storage.cjs');

async function run() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-smoke-'));
  const storage = initializeStorage(dir, path.resolve('prisma'));
  const serverRoot = path.resolve(process.argv[2] || '.next/standalone');
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(serverRoot, 'server.js')], {
    cwd: serverRoot, env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: String(port), DATABASE_URL: storage.databaseUrl, PAPER_MANAGER_DATA_DIR: dir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', data => { log += data; });
  child.stderr.on('data', data => { log += data; });
  async function json(url, method = 'GET', body, status = 200) {
    const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json();
    assert.equal(res.status, status, JSON.stringify(data));
    return data;
  }
  async function upload(content = '%PDF-1.4\nsmoke fixture', name = 'test.pdf', status = 201) {
    const form = new FormData(); form.append('file', new Blob([content], { type: 'application/pdf' }), name);
    const res = await fetch(base + '/api/upload', { method: 'POST', body: form });
    assert.equal(res.status, status);
    return res.json();
  }
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (child.exitCode !== null) throw new Error(log);
      try { if ((await fetch(base + '/api/papers')).ok) { ready = true; break; } } catch { /* booting */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, log);
    assert.deepEqual(await json('/api/papers'), []);
    const home = await fetch(base); assert.equal(home.status, 200);
    const html = await home.text(); assert.ok(html.includes('Paper Manager'));
    const stylesheet = html.match(/href="([^"]+\.css[^"]*)"/);
    assert.ok(stylesheet); assert.equal((await fetch(base + stylesheet[1].replaceAll('&amp;', '&'))).status, 200);
    const crossOrigin = await fetch(base + '/api/papers', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' }, body: JSON.stringify({ title: 'CSRF' }) });
    assert.equal(crossOrigin.status, 403);
    const pdf = await upload();
    assert.equal((await fetch(base + pdf.url)).headers.get('content-type'), 'application/pdf');
    const a = await json('/api/papers', 'POST', { title: 'First paper', authors: 'Alice', journal: 'Nature', abstract: 'Quantum experiment', year: 2024, pdfPath: pdf.url }, 201);
    const b = await json('/api/papers', 'POST', { title: 'Shared PDF', pdfPath: pdf.url }, 201);
    for (const term of ['First', 'Alice', 'Nature', 'Quantum']) assert.equal((await json('/api/papers?q=' + term)).length, 1);
    await json('/api/upload', 'DELETE', { url: pdf.url }, 409);
    await json('/api/papers/' + a.id, 'PATCH', { title: 'Edited paper' });
    assert.equal((await json('/api/papers')).find(p => p.id === a.id).title, 'Edited paper');
    await json('/api/papers/' + a.id, 'DELETE');
    assert.equal((await fetch(base + pdf.url)).status, 200, 'shared PDF must survive');
    const replacement = await upload();
    await json('/api/papers/' + b.id, 'PATCH', { pdfPath: replacement.url });
    assert.equal((await fetch(base + pdf.url)).status, 404);
    await json('/api/papers/' + b.id, 'DELETE');
    assert.equal((await fetch(base + replacement.url)).status, 404);
    const racePdf = await upload();
    const raceA = await json('/api/papers', 'POST', { title: 'Race A', pdfPath: racePdf.url }, 201);
    const raceB = await json('/api/papers', 'POST', { title: 'Race B' }, 201);
    const [attached, removed] = await Promise.all([
      fetch(base + '/api/papers/' + raceB.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pdfPath: racePdf.url }) }),
      fetch(base + '/api/papers/' + raceA.id, { method: 'DELETE' }),
    ]);
    assert.equal(removed.status, 200);
    assert.ok([200, 400].includes(attached.status));
    if (attached.status === 200) assert.equal((await fetch(base + racePdf.url)).status, 200, 'concurrent attach must preserve the file');
    await json('/api/papers/' + raceB.id, 'DELETE');
    await json('/api/upload', 'DELETE', null, 400);
    const invalidUpload = await fetch(base + '/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(invalidUpload.status, 400);
    const batch = await json('/api/papers', 'POST', [{ title: 'RIS one' }, { title: 'RIS two' }], 201);
    assert.equal(batch.count, 2);
    await json('/api/papers', 'POST', [{ title: 'Valid' }, { title: '' }], 400);
    assert.equal((await json('/api/papers')).length, 2, 'invalid batch must be atomic');
    await json('/api/papers', 'POST', { title: ' ' }, 400);
    await json('/api/papers', 'POST', { title: 'Invalid path', pdfPath: '/uploads/pdfs/../../secret.pdf' }, 400);
    await json('/api/papers/not-an-id', 'DELETE', undefined, 400);
    await json('/api/papers/999999', 'PATCH', { title: 'Missing' }, 404);
    await json('/api/papers/999999', 'DELETE', undefined, 404);
    const malformed = await fetch(base + '/api/papers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    await upload('not PDF', 'fake.pdf', 400);
    const staged = await upload(); await json('/api/upload', 'DELETE', { url: staged.url });
    assert.equal((await fetch(base + staged.url)).status, 404);
    for (const paper of await json('/api/papers')) await json('/api/papers/' + paper.id, 'DELETE');
    assert.deepEqual(fs.readdirSync(path.join(dir, 'uploads', 'pdfs')), []);
    console.log('PASS: standalone page/assets, CRUD, 4-field search, RIS batch, shared/replaced PDF cleanup, upload cancellation, validation, 404 and malformed JSON');
  } catch (error) { console.error(log); throw error; }
  finally {
    child.kill();
    if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });

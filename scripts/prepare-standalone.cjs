const fs = require('node:fs');
const path = require('node:path');
const dest = path.resolve('.next/standalone');
if (!fs.existsSync(path.join(dest, 'server.js'))) throw new Error('Run next build before preparing standalone assets');
fs.cpSync('.next/static', path.join(dest, '.next/static'), { recursive: true });
fs.cpSync('public', path.join(dest, 'public'), {
  recursive: true,
  filter: source => source !== path.join('public', 'uploads') && !source.startsWith(path.join('public', 'uploads') + path.sep),
});
if (!fs.existsSync(path.join(dest, 'node_modules/.prisma/client/query_engine-windows.dll.node'))) throw new Error('Windows Prisma engine is missing');

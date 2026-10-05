const path = require('node:path');
const { initializeStorage } = require('../main/storage.cjs');
initializeStorage(path.resolve(process.env.PAPER_MANAGER_DATA_DIR || '.data'), path.resolve('prisma'));

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = 'C:\\Users\\Alex\\.21st-desktop\\data\\agents.db';
const db = new Database(dbPath, { readonly: false });

try {
  console.log('Adding worktree_base_location column to projects table...');
  db.exec('ALTER TABLE `projects` ADD COLUMN `worktree_base_location` text');
  console.log('Column added successfully!');
} catch (err) {
  if (err.message.includes('duplicate column')) {
    console.log('Column already exists, nothing to do.');
  } else {
    console.error('Error:', err.message);
    process.exit(1);
  }
} finally {
  db.close();
}

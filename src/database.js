// database.js
const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize Supabase client
const supabaseUrl = 'https://hxzcihdozbbbirqhgzyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4emNpaGRvemJiYmlycWhnenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwNzQyMTEsImV4cCI6MjA1ODY1MDIxMX0.Wyc1VJIenpi4vXKkbkKmPCNnSl7WHvJtFzeCJRZBDQo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize local SQLite for offline queuing
const dbPath = path.join(__dirname, '../local_inventory.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening local database:', err.message);
  } else {
    console.log('Connected to local SQLite database at', dbPath);
  }
});

db.serialize(() => {
  // Local queue for changes (to sync when online)
  db.run(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL, -- 'insert', 'update', 'delete'
      data TEXT NOT NULL, -- JSON string of the data
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0 -- 0 = not synced, 1 = synced
    )
  `);

  // Local tables mirroring Supabase (for offline use)
  db.run(`
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      location TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      product TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      storage_location TEXT,
      comments TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      supabase_id INTEGER
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS staging_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      form_no TEXT NOT NULL,
      location TEXT NOT NULL,
      product TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      staging_location TEXT NOT NULL,
      status TEXT NOT NULL,
      comments TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      supabase_id INTEGER
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS transaction_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      form_no TEXT NOT NULL,
      transaction_id TEXT NOT NULL,
      product TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL,
      comments TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      supabase_id INTEGER
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_display (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      location TEXT NOT NULL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      supabase_id INTEGER
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS staging_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      form_no TEXT NOT NULL,
      current_batch TEXT,
      batch_id TEXT NOT NULL,
      product TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      comments TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      supabase_id INTEGER
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS product_master (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      unit_price REAL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      supabase_id INTEGER
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_type TEXT NOT NULL,
      date_range_start TEXT NOT NULL,
      date_range_end TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      supabase_id INTEGER
    )
  `);
});

// Insert data locally and queue for sync
async function insertData(table, data, callback) {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(key => data[key]);
  const sql = `INSERT INTO ${table} (${keys.join(', ')}, created_at) VALUES (${placeholders}, CURRENT_TIMESTAMP)`;

  db.run(sql, values, function(err) {
    if (err) {
      console.error(`Error inserting into local ${table}:`, err.message);
      callback(err);
    } else {
      const localId = this.lastID;
      // Queue the change for sync
      const queueSql = `INSERT INTO sync_queue (table_name, operation, data, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`;
      db.run(queueSql, [table, 'insert', JSON.stringify({ ...data, local_id: localId })], (queueErr) => {
        if (queueErr) {
          console.error('Error queuing for sync:', queueErr.message);
          callback(queueErr);
        } else {
          console.log(`Inserted into local ${table}, ID: ${localId}, queued for sync`);
          callback(null, localId);
        }
      });
    }
  });
}

// Fetch local data (for offline use)
function fetchLocalData(table, callback) {
  db.all(`SELECT * FROM ${table} ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error(`Error fetching local ${table} data:`, err.message);
      callback(err, null);
    } else {
      callback(null, rows);
    }
  });
}

// Sync local queue with Supabase
async function syncData() {
  // Check if online
  const isOnline = await checkOnlineStatus();
  if (!isOnline) {
    console.log('Offline - cannot sync');
    return { success: false, message: 'Offline - changes queued', uploaded: 0, failed: 0, downloaded: 0 };
  }

  // Get unsynced items from queue
  const unsynced = await new Promise((resolve, reject) => {
    db.all(`SELECT * FROM sync_queue WHERE synced = 0`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  let uploaded = 0;
  let failed = 0;

  for (const item of unsynced) {
    try {
      if (item.operation === 'insert') {
        const data = JSON.parse(item.data);
        const { local_id, ...record } = data; // Remove local_id for Supabase
        const { data: result, error } = await supabase
          .from(item.table_name)
          .insert([record])
          .select('id')
          .single();
        if (error) throw error;

        // Update local record with Supabase ID
        db.run(`UPDATE ${item.table_name} SET supabase_id = ? WHERE id = ?`, [result.id, local_id], (err) => {
          if (err) console.error('Error updating local record with Supabase ID:', err.message);
        });

        // Mark as synced
        db.run(`UPDATE sync_queue SET synced = 1 WHERE id = ?`, [item.id]);
        uploaded++;
      }
      // Add 'update' and 'delete' operations if needed...
    } catch (err) {
      console.error(`Error syncing ${item.table_name} item ${item.id}:`, err.message);
      failed++;
    }
  }

  // Download updates from Supabase
  const tables = [
    'transfers',
    'staging_requests',
    'transaction_updates',
    'inventory_display',
    'staging_updates',
    'product_master',
    'reports'
  ];
  let downloaded = 0;
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(`Error downloading ${table}:`, error.message);
      continue;
    }

    for (const record of data) {
      const exists = await new Promise((resolve) => {
        db.get(`SELECT id FROM ${table} WHERE supabase_id = ?`, [record.id], (err, row) => {
          resolve(row);
        });
      });

      if (!exists) {
        const { id: supabaseId, ...recordData } = record;
        const keys = Object.keys(recordData);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(key => recordData[key]);
        const sql = `INSERT INTO ${table} (${keys.join(', ')}, supabase_id) VALUES (${placeholders}, ?)`;
        await new Promise((resolve, reject) => {
          db.run(sql, [...values, supabaseId], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        downloaded++;
      }
    }
  }

  return { success: true, uploaded, failed, downloaded };
}

// Check online status
async function checkOnlineStatus() {
  try {
    await supabase.from('transfers').select('id').limit(1);
    return true;
  } catch (err) {
    return false;
  }
}

function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
  });
}

module.exports = {
  insertData,
  fetchLocalData,
  syncData,
  closeDatabase
};
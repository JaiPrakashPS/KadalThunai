import * as SQLite from 'expo-sqlite';

let db = null;

/**
 * Get or open the SQLite database (singleton)
 */
export const getDatabase = () => {
  if (!db) {
    db = SQLite.openDatabaseSync('kadal_thunai.db');
  }
  return db;
};

/**
 * Initialize all tables
 */
export const initDatabase = async () => {
  const database = getDatabase();

  database.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // Profile cache
  database.execSync(`
    CREATE TABLE IF NOT EXISTS profile_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      name TEXT,
      email TEXT,
      phone TEXT,
      role TEXT,
      preferred_language TEXT DEFAULT 'ta',
      license_no TEXT,
      license_expiry TEXT,
      village TEXT,
      district TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Boats cache
  database.execSync(`
    CREATE TABLE IF NOT EXISTS boats_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT UNIQUE,
      name TEXT,
      registration_no TEXT,
      type TEXT,
      capacity INTEGER,
      engine_no TEXT,
      is_active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Fishing zones cache
  database.execSync(`
    CREATE TABLE IF NOT EXISTS fishing_zones_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT UNIQUE NOT NULL,
      name TEXT,
      name_tamil TEXT,
      coordinates TEXT,
      safety_level TEXT,
      description TEXT,
      recommended_species TEXT,
      center_lat REAL,
      center_lng REAL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Catches - offline write table
  database.execSync(`
    CREATE TABLE IF NOT EXISTS catches_offline (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT,
      sync_status TEXT DEFAULT 'pending',
      species TEXT NOT NULL,
      species_tamil TEXT,
      quantity REAL DEFAULT 0,
      weight REAL DEFAULT 0,
      weight_unit TEXT DEFAULT 'kg',
      earnings REAL DEFAULT 0,
      catch_lat REAL,
      catch_lng REAL,
      catch_location_name TEXT,
      boat_id TEXT,
      notes TEXT,
      catch_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // SOS offline write table
  database.execSync(`
    CREATE TABLE IF NOT EXISTS sos_offline (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT,
      sync_status TEXT DEFAULT 'pending',
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      accuracy REAL,
      message TEXT DEFAULT 'Emergency! Need immediate assistance.',
      emergency_type TEXT DEFAULT 'other',
      boat_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Incidents offline write table
  database.execSync(`
    CREATE TABLE IF NOT EXISTS incidents_offline (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT,
      sync_status TEXT DEFAULT 'pending',
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      lat REAL,
      lng REAL,
      location_name TEXT,
      severity TEXT DEFAULT 'medium',
      image_uri TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Complaints offline write table
  database.execSync(`
    CREATE TABLE IF NOT EXISTS complaints_offline (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT,
      sync_status TEXT DEFAULT 'pending',
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      lat REAL,
      lng REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Government schemes cache
  database.execSync(`
    CREATE TABLE IF NOT EXISTS schemes_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT UNIQUE NOT NULL,
      title TEXT,
      title_tamil TEXT,
      description TEXT,
      description_tamil TEXT,
      category TEXT,
      eligibility TEXT,
      deadline TEXT,
      is_active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Notifications cache
  database.execSync(`
    CREATE TABLE IF NOT EXISTS notifications_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT UNIQUE NOT NULL,
      title TEXT,
      title_tamil TEXT,
      body TEXT,
      body_tamil TEXT,
      type TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Weather cache
  database.execSync(`
    CREATE TABLE IF NOT EXISTS weather_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL,
      lng REAL,
      data TEXT,
      fetched_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Market prices cache
  database.execSync(`
    CREATE TABLE IF NOT EXISTS market_prices_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT UNIQUE,
      species TEXT,
      species_tamil TEXT,
      price REAL,
      min_price REAL,
      max_price REAL,
      unit TEXT DEFAULT 'kg',
      market TEXT,
      district TEXT,
      price_date TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log('✅ SQLite database initialized');
};

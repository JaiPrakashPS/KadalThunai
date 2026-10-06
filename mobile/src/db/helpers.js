import { getDatabase } from './database';

// ─── Catches ─────────────────────────────────────────────────────────────────

export const saveCatchOffline = (data) => {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO catches_offline
      (species, species_tamil, quantity, weight, weight_unit, earnings,
       catch_lat, catch_lng, catch_location_name, boat_id, notes, catch_date, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      data.species, data.speciesTamil || null, data.quantity, data.weight,
      data.weightUnit || 'kg', data.earnings || 0,
      data.location?.lat || null, data.location?.lng || null,
      data.location?.name || null, data.boatId || null, data.notes || null,
      data.catchDate || new Date().toISOString(),
    ]
  );
  return result.lastInsertRowId;
};

export const getPendingCatches = () => {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM catches_offline WHERE sync_status = 'pending'`);
};

export const markCatchSynced = (localId, serverId) => {
  const db = getDatabase();
  db.runSync(
    `UPDATE catches_offline SET sync_status = 'synced', server_id = ?, updated_at = datetime('now') WHERE local_id = ?`,
    [serverId, localId]
  );
};

export const getAllCatches = (limit = 50) => {
  const db = getDatabase();
  return db.getAllSync(
    `SELECT * FROM catches_offline ORDER BY catch_date DESC LIMIT ?`,
    [limit]
  );
};

// ─── SOS ─────────────────────────────────────────────────────────────────────

export const saveSOSOffline = (data) => {
  const db = getDatabase();
  const lat = data.location?.lat ?? data.latitude ?? null;
  const lng = data.location?.lng ?? data.longitude ?? null;
  const accuracy = data.location?.accuracy ?? data.accuracy ?? null;
  const message = data.message || 'Emergency!';
  const emergencyType = data.emergencyType || data.emergency_type || 'other';
  const boatId = data.boatId || null;

  const result = db.runSync(
    `INSERT INTO sos_offline (lat, lng, accuracy, message, emergency_type, boat_id, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [lat, lng, accuracy, message, emergencyType, boatId]
  );
  return result.lastInsertRowId;
};

export const getPendingSOS = () => {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM sos_offline WHERE sync_status = 'pending'`);
};

export const markSOSSynced = (localId, serverId) => {
  const db = getDatabase();
  db.runSync(
    `UPDATE sos_offline SET sync_status = 'synced', server_id = ?, updated_at = datetime('now') WHERE local_id = ?`,
    [serverId, localId]
  );
};

// ─── Complaints ──────────────────────────────────────────────────────────────

export const saveComplaintOffline = (data) => {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO complaints_offline (category, title, description, lat, lng, sync_status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [data.category, data.title, data.description, data.location?.lat, data.location?.lng]
  );
  return result.lastInsertRowId;
};

export const getPendingComplaints = () => {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM complaints_offline WHERE sync_status = 'pending'`);
};

export const markComplaintSynced = (localId, serverId) => {
  const db = getDatabase();
  db.runSync(
    `UPDATE complaints_offline SET sync_status = 'synced', server_id = ?, updated_at = datetime('now') WHERE local_id = ?`,
    [serverId, localId]
  );
};

// ─── Fishing Recommendations Caching & Offline Helpers ──────────────────────────

export const cacheFishingZones = (zones) => {
  const db = getDatabase();
  db.runSync(`DELETE FROM fishing_zones_cache`);
  for (const z of zones) {
    db.runSync(
      `INSERT OR REPLACE INTO fishing_zones_cache
        (server_id, species, abundance, lat, lng, reporter_name, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        z._id, z.species, z.abundance || 'medium',
        z.location?.lat, z.location?.lng,
        z.fishermanId?.name || null, z.notes || null, z.createdAt || null
      ]
    );
  }
};

export const getCachedFishingZones = () => {
  const db = getDatabase();
  const cached = db.getAllSync(`SELECT * FROM fishing_zones_cache`);
  const pending = db.getAllSync(`SELECT * FROM fishing_zones_offline WHERE sync_status = 'pending'`);
  
  const mappedPending = pending.map(p => ({
    _id: `pending_${p.local_id}`,
    localId: p.local_id.toString(),
    species: p.species,
    abundance: p.abundance,
    location: { lat: p.lat, lng: p.lng },
    fishermanId: { name: 'You (Pending)' },
    notes: p.notes,
    createdAt: p.created_at,
    isPending: true
  }));

  const mappedCached = cached.map(c => ({
    _id: c.server_id,
    species: c.species,
    abundance: c.abundance,
    location: { lat: c.lat, lng: c.lng },
    fishermanId: { name: c.reporter_name || 'Fisherman' },
    notes: c.notes,
    createdAt: c.created_at
  }));

  return [...mappedPending, ...mappedCached];
};

export const saveFishingZoneOffline = (data) => {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO fishing_zones_offline (species, abundance, lat, lng, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [data.species, data.abundance || 'medium', data.lat, data.lng, data.notes || null]
  );
  return result.lastInsertRowId;
};

export const getPendingFishingZones = () => {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM fishing_zones_offline WHERE sync_status = 'pending'`);
};

export const markFishingZoneSynced = (localId, serverId) => {
  const db = getDatabase();
  db.runSync(
    `UPDATE fishing_zones_offline SET sync_status = 'synced', server_id = ?, updated_at = datetime('now') WHERE local_id = ?`,
    [serverId, localId]
  );
};

// Accept both: cacheWeather(data)  or  cacheWeather(lat, lng, data)
export const cacheWeather = (latOrData, lng, data) => {
  const db = getDatabase();
  let lat, weatherData;
  if (typeof latOrData === 'object' && latOrData !== null) {
    // Called as cacheWeather(data)
    lat = latOrData.lat || null;
    lng = latOrData.lng || null;
    weatherData = latOrData;
  } else {
    // Called as cacheWeather(lat, lng, data)
    lat = latOrData;
    weatherData = data;
  }
  db.runSync(`DELETE FROM weather_cache`);
  db.runSync(
    `INSERT INTO weather_cache (lat, lng, data) VALUES (?, ?, ?)`,
    [lat || null, lng || null, JSON.stringify(weatherData)]
  );
};

export const getCachedWeather = () => {
  const db = getDatabase();
  const row = db.getFirstSync(`SELECT * FROM weather_cache ORDER BY fetched_at DESC LIMIT 1`);
  if (!row) return null;
  return { ...JSON.parse(row.data), cachedAt: row.fetched_at };
};

export const cacheMarketPrices = (prices) => {
  const db = getDatabase();
  for (const p of prices) {
    db.runSync(
      `INSERT OR REPLACE INTO market_prices_cache
        (server_id, species, species_tamil, price, min_price, max_price, unit, market, district, price_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p._id || p.id || null,
        p.fishName || p.species || 'Unknown',
        p.fishNameTamil || p.speciesTamil || p.species_tamil || null,
        p.retailPrice !== undefined ? p.retailPrice : (p.price || 0),
        p.wholesalePrice !== undefined ? p.wholesalePrice : (p.minPrice || p.min_price || null),
        p.retailPrice !== undefined ? p.retailPrice : (p.maxPrice || p.max_price || null),
        p.unit || 'kg',
        p.market,
        p.district,
        p.date || p.priceDate || p.price_date || new Date().toISOString()
      ]
    );
  }
};

export const getCachedMarketPrices = () => {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM market_prices_cache ORDER BY price_date DESC`);
};

export const cacheSchemes = (schemes) => {
  const db = getDatabase();
  for (const s of schemes) {
    db.runSync(
      `INSERT OR REPLACE INTO schemes_cache
        (server_id, title, title_tamil, description, description_tamil, category, eligibility, deadline, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s._id, s.title, s.titleTamil || null, s.description, s.descriptionTamil || null,
       s.category, s.eligibility || null, s.deadline || null, s.isActive ? 1 : 0]
    );
  }
};

export const getCachedSchemes = () => {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM schemes_cache WHERE is_active = 1`);
};

// ─── Boats ───────────────────────────────────────────────────────────────────

export const cacheBoats = (boats) => {
  const db = getDatabase();
  db.runSync(`DELETE FROM boats_cache`);
  for (const b of boats) {
    db.runSync(
      `INSERT OR REPLACE INTO boats_cache (server_id, name, registration_no, type, capacity, engine_no, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [b._id || b.id || null, b.name, b.registrationNo || b.registration_no || null, b.type || null, b.capacity || 0, b.engineNo || b.engine_no || null, b.isActive !== false ? 1 : 0]
    );
  }
};

export const getCachedBoats = () => {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM boats_cache`);
};

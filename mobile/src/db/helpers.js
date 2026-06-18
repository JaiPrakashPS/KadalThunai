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

// ─── Incidents ───────────────────────────────────────────────────────────────

export const saveIncidentOffline = (data) => {
  const db = getDatabase();
  const lat = data.location?.lat ?? data.location?.latitude ?? null;
  const lng = data.location?.lng ?? data.location?.longitude ?? null;
  const result = db.runSync(
    `INSERT INTO incidents_offline (type, description, lat, lng, location_name, severity, image_uri, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      data.type, data.description, lat, lng,
      data.location?.name || null, data.severity || 'medium', data.imageUri || null,
    ]
  );
  return result.lastInsertRowId;
};

export const getPendingIncidents = () => {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM incidents_offline WHERE sync_status = 'pending'`);
};

export const markIncidentSynced = (localId, serverId) => {
  const db = getDatabase();
  db.runSync(
    `UPDATE incidents_offline SET sync_status = 'synced', server_id = ?, updated_at = datetime('now') WHERE local_id = ?`,
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

// ─── Cache (zones, schemes, weather, prices) ─────────────────────────────────

export const cacheFishingZones = (zones) => {
  const db = getDatabase();
  for (const z of zones) {
    db.runSync(
      `INSERT OR REPLACE INTO fishing_zones_cache
        (server_id, name, name_tamil, coordinates, safety_level, description, recommended_species, center_lat, center_lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        z._id, z.name, z.nameTamil || null, JSON.stringify(z.coordinates),
        z.safetyLevel, z.description, JSON.stringify(z.recommendedSpecies || []),
        z.centerPoint?.lat, z.centerPoint?.lng,
      ]
    );
  }
};

export const getCachedFishingZones = () => {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM fishing_zones_cache`).map((z) => ({
    ...z,
    coordinates: JSON.parse(z.coordinates || '[]'),
    recommendedSpecies: JSON.parse(z.recommended_species || '[]'),
  }));
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
      [p._id || null, p.species, p.speciesTamil || null, p.price, p.minPrice || null,
       p.maxPrice || null, p.unit || 'kg', p.market, p.district, p.priceDate]
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

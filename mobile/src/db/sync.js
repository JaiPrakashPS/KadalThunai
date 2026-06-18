import api from '../api/axios';
import { ENDPOINTS } from '../constants/api';
import {
  getPendingCatches, markCatchSynced,
  getPendingSOS, markSOSSynced,
  getPendingIncidents, markIncidentSynced,
  getPendingComplaints, markComplaintSynced,
} from './helpers';

/**
 * Sync all pending offline records to the backend.
 * Called when network reconnects or app comes to foreground.
 */
export const syncAllPending = async () => {
  const results = { catches: 0, sos: 0, incidents: 0, complaints: 0, errors: [] };

  try {
    // ── Sync catches ──
    const pendingCatches = getPendingCatches();
    if (pendingCatches.length > 0) {
      const mapped = pendingCatches.map((c) => ({
        localId: c.local_id.toString(),
        species: c.species,
        speciesTamil: c.species_tamil,
        quantity: c.quantity,
        weight: c.weight,
        weightUnit: c.weight_unit,
        earnings: c.earnings,
        location: c.catch_lat ? { lat: c.catch_lat, lng: c.catch_lng, name: c.catch_location_name } : null,
        boatId: c.boat_id,
        notes: c.notes,
        catchDate: c.catch_date,
      }));

      const res = await api.post(ENDPOINTS.CATCHES_SYNC, { records: mapped });
      for (const r of res.data.data || []) {
        if (r.success) {
          markCatchSynced(parseInt(r.localId), r.serverId);
          results.catches++;
        }
      }
    }

    // ── Sync SOS ──
    const pendingSOS = getPendingSOS();
    if (pendingSOS.length > 0) {
      const mapped = pendingSOS.map((s) => ({
        localId: s.local_id.toString(),
        location: { lat: s.lat, lng: s.lng, accuracy: s.accuracy },
        message: s.message,
        emergencyType: s.emergency_type,
        boatId: s.boat_id,
      }));

      const res = await api.post(ENDPOINTS.SOS_SYNC, { records: mapped });
      for (const r of res.data.data || []) {
        if (r.success) {
          markSOSSynced(parseInt(r.localId), r.serverId);
          results.sos++;
        }
      }
    }

    // ── Sync incidents ──
    const pendingIncidents = getPendingIncidents();
    if (pendingIncidents.length > 0) {
      const mapped = pendingIncidents.map((i) => ({
        localId: i.local_id.toString(),
        type: i.type,
        description: i.description,
        location: i.lat ? { lat: i.lat, lng: i.lng, name: i.location_name } : null,
        severity: i.severity,
      }));

      const res = await api.post(ENDPOINTS.INCIDENTS + '/sync', { records: mapped });
      for (const r of res.data.data || []) {
        if (r.success) {
          markIncidentSynced(parseInt(r.localId), r.serverId);
          results.incidents++;
        }
      }
    }

    // ── Sync complaints ──
    const pendingComplaints = getPendingComplaints();
    if (pendingComplaints.length > 0) {
      const mapped = pendingComplaints.map((c) => ({
        localId: c.local_id.toString(),
        category: c.category,
        title: c.title,
        description: c.description,
        location: c.lat ? { lat: c.lat, lng: c.lng } : null,
      }));

      const res = await api.post(ENDPOINTS.COMPLAINTS + '/sync', { records: mapped });
      for (const r of res.data.data || []) {
        if (r.success) {
          markComplaintSynced(parseInt(r.localId), r.serverId);
          results.complaints++;
        }
      }
    }

  } catch (err) {
    results.errors.push(err.message);
    console.warn('⚠️ Sync error:', err.message);
  }

  const totalSynced = results.catches + results.sos + results.incidents + results.complaints;
  if (totalSynced > 0) {
    console.log(`✅ Synced: ${results.catches} catches, ${results.sos} SOS, ${results.incidents} incidents, ${results.complaints} complaints`);
  }

  return results;
};

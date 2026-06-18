import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import styles from './DataPage.module.css';

const STATUS_COLORS = {
  pending:      { bg: 'rgba(239,68,68,0.15)',    color: '#EF4444', label: 'Pending' },
  acknowledged: { bg: 'rgba(245,158,11,0.15)',   color: '#F59E0B', label: 'Acknowledged' },
  dispatched:   { bg: 'rgba(59,130,246,0.15)',   color: '#3B82F6', label: 'Dispatched' },
  resolved:     { bg: 'rgba(16,185,129,0.15)',   color: '#10B981', label: 'Resolved' },
  false_alarm:  { bg: 'rgba(100,116,139,0.15)',  color: '#64748B', label: 'False Alarm' },
};

const EMERGENCY_ICONS = {
  medical:   '🏥', breakdown: '⚓', weather: '🌊',
  capsized:  '🚨', fire: '🔥',    other: '🆘',
};

const timeAgo = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function SOSPage() {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating]     = useState(null);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/sos', { params });
      const data = res.data;
      setRecords(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, newStatus) => {
    setUpdating(id);
    try {
      await api.patch(`/sos/${id}/status`, { status: newStatus });
      load();
    } catch (e) {
      alert('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const tabs = ['all', 'pending', 'acknowledged', 'dispatched', 'resolved', 'false_alarm'];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>🆘 SOS Alert Monitor</h1>
          <p className={styles.pageSubtitle}>{total} total SOS requests · Real-time monitoring</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {/* Status Tabs */}
      <div className={styles.tabRow}>
        {tabs.map(t => (
          <button
            key={t}
            className={`${styles.tab} ${statusFilter === t ? styles.tabActive : ''}`}
            onClick={() => { setStatusFilter(t); setPage(1); }}
          >
            {t === 'all' ? 'All' : STATUS_COLORS[t]?.label || t}
            {t === 'pending' && <span className={styles.dangerDot} />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h2 className="empty-title">No SOS records found</h2>
          <p className="empty-desc">
            {statusFilter === 'pending' ? 'All alerts have been addressed.' : 'No records match this filter.'}
          </p>
        </div>
      ) : (
        <div className={styles.sosGrid}>
          {records.map(item => {
            const cfg = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
            const coords = item.location?.coordinates;
            return (
              <div key={item._id} className={styles.sosCard} style={{ borderLeftColor: cfg.color }}>
                <div className={styles.sosCardTop}>
                  <div className={styles.sosEmergency}>
                    <span className={styles.sosEmIcon}>{EMERGENCY_ICONS[item.emergencyType] || '🆘'}</span>
                    <div>
                      <div className={styles.sosType}>{item.emergencyType?.replace(/_/g, ' ') || 'Emergency'}</div>
                      <div className={styles.sosUser}>{item.userId?.name || 'Unknown Fisherman'}</div>
                    </div>
                  </div>
                  <span className={styles.sosBadge} style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>

                {item.description && (
                  <p className={styles.sosDesc}>{item.description}</p>
                )}

                <div className={styles.sosMeta}>
                  <span>🕐 {timeAgo(item.createdAt)}</span>
                  {coords && (
                    <a
                      href={`https://maps.google.com/?q=${coords[1]},${coords[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mapsLink}
                    >
                      📍 View Location
                    </a>
                  )}
                </div>

                {/* Action Buttons */}
                {item.status === 'pending' && (
                  <div className={styles.sosActions}>
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ color: '#F59E0B', borderColor: '#F59E0B33' }}
                      disabled={updating === item._id}
                      onClick={() => updateStatus(item._id, 'acknowledged')}
                    >
                      ✓ Acknowledge
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ color: '#64748B' }}
                      disabled={updating === item._id}
                      onClick={() => updateStatus(item._id, 'false_alarm')}
                    >
                      ✗ False Alarm
                    </button>
                  </div>
                )}
                {item.status === 'acknowledged' && (
                  <div className={styles.sosActions}>
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ color: '#3B82F6', borderColor: '#3B82F633' }}
                      disabled={updating === item._id}
                      onClick={() => updateStatus(item._id, 'dispatched')}
                    >
                      🚁 Dispatch
                    </button>
                  </div>
                )}
                {item.status === 'dispatched' && (
                  <div className={styles.sosActions}>
                    <button
                      className="btn btn-sm btn-success"
                      disabled={updating === item._id}
                      onClick={() => updateStatus(item._id, 'resolved')}
                    >
                      ✅ Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </span>
          <div className="pagination-btns">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="page-btn" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

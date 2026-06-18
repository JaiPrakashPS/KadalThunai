import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import styles from './DataPage.module.css';

const SEVERITY_CFG = {
  low:      { bg: 'rgba(16,185,129,0.15)',   color: '#10B981', label: 'Low' },
  medium:   { bg: 'rgba(245,158,11,0.15)',   color: '#F59E0B', label: 'Medium' },
  high:     { bg: 'rgba(239,68,68,0.15)',    color: '#EF4444', label: 'High' },
  critical: { bg: 'rgba(255,0,51,0.18)',     color: '#FF0033', label: 'Critical' },
};
const STATUS_CFG = {
  submitted:    { color: '#3B82F6', label: 'Submitted' },
  under_review: { color: '#F59E0B', label: 'Under Review' },
  resolved:     { color: '#10B981', label: 'Resolved' },
  closed:       { color: '#64748B', label: 'Closed' },
};
const TYPE_ICONS = {
  storm: '🌪️', oil_spill: '🛢️', debris: '🗑️',
  boat_accident: '⛵', obstacle: '⚠️', suspicious_activity: '👁️',
};

const timeAgo = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
};

export default function IncidentsPage() {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected]     = useState(null);
  const [updating, setUpdating]     = useState(false);
  const [newStatus, setNewStatus]   = useState('');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/incidents', { params });
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

  const handleUpdate = async () => {
    if (!selected || !newStatus) return;
    setUpdating(true);
    try {
      await api.patch(`/incidents/${selected._id}/status`, { status: newStatus });
      setSelected(null);
      load();
    } catch (e) {
      alert('Failed to update incident');
    } finally {
      setUpdating(false);
    }
  };

  const tabs = ['all', 'submitted', 'under_review', 'resolved', 'closed'];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>⚠️ Incident Reports</h1>
          <p className={styles.pageSubtitle}>{total} total incidents reported</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {/* Tabs */}
      <div className={styles.tabRow}>
        {tabs.map(t => (
          <button
            key={t}
            className={`${styles.tab} ${statusFilter === t ? styles.tabActive : ''}`}
            onClick={() => { setStatusFilter(t); setPage(1); }}
          >
            {t === 'all' ? 'All' : STATUS_CFG[t]?.label || t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h2 className="empty-title">No incidents found</h2>
          <p className="empty-desc">No incidents match the selected filter.</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Reported By</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map(inc => {
                  const sev = SEVERITY_CFG[inc.severity] || SEVERITY_CFG.low;
                  const sts = STATUS_CFG[inc.status] || STATUS_CFG.submitted;
                  return (
                    <tr key={inc._id}>
                      <td>
                        <span style={{ fontSize: 18, marginRight: 6 }}>{TYPE_ICONS[inc.type] || '⚠️'}</span>
                        <span style={{ textTransform: 'capitalize' }}>{inc.type?.replace(/_/g, ' ')}</span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>
                      </td>
                      <td>{inc.reportedBy?.name || 'Unknown'}</td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inc.description}
                      </td>
                      <td>
                        <span className="badge" style={{ color: sts.color, background: sts.color + '22' }}>{sts.label}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{timeAgo(inc.createdAt)}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setSelected(inc); setNewStatus(inc.status); }}
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
      )}

      {/* Update Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Update Incident Status</h2>
            <p className="modal-subtitle">
              {TYPE_ICONS[selected.type] || '⚠️'} {selected.type?.replace(/_/g, ' ')} ·{' '}
              {selected.reportedBy?.name || 'Unknown'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
              {selected.description}
            </p>
            <div className="form-group">
              <label className="form-label">New Status</label>
              <select
                className="form-select"
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
              >
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={updating} onClick={handleUpdate}>
                {updating ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

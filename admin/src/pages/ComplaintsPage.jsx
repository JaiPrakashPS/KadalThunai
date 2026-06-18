import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import styles from './DataPage.module.css';

const STATUS_CFG = {
  open:           { color: '#EF4444', bg: 'rgba(239,68,68,0.15)',    label: 'Open' },
  under_review:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',   label: 'Under Review' },
  resolved:       { color: '#10B981', bg: 'rgba(16,185,129,0.15)',   label: 'Resolved' },
  rejected:       { color: '#64748B', bg: 'rgba(100,116,139,0.15)', label: 'Rejected' },
};

const CATEGORY_ICONS = {
  water_quality: '💧', illegal_fishing: '🚫', infrastructure: '🏗️',
  pollution: '🌊', theft: '🔒', other: '📋',
};

const timeAgo = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
};

export default function ComplaintsPage() {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected]     = useState(null);
  const [response, setResponse]     = useState('');
  const [newStatus, setNewStatus]   = useState('');
  const [updating, setUpdating]     = useState(false);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/complaints', { params });
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
      await api.patch(`/complaints/${selected._id}/respond`, {
        status: newStatus,
        officerResponse: response,
      });
      setSelected(null);
      setResponse('');
      load();
    } catch (e) {
      alert('Failed to update complaint');
    } finally {
      setUpdating(false);
    }
  };

  const tabs = ['all', 'open', 'under_review', 'resolved', 'rejected'];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>📋 Complaint Resolution</h1>
          <p className={styles.pageSubtitle}>{total} total complaints</p>
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
          <h2 className="empty-title">No complaints found</h2>
          <p className="empty-desc">No complaints match the selected filter.</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Submitted By</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map(cmp => {
                  const sts = STATUS_CFG[cmp.status] || STATUS_CFG.open;
                  return (
                    <tr key={cmp._id}>
                      <td>
                        <span style={{ fontSize: 18, marginRight: 6 }}>
                          {CATEGORY_ICONS[cmp.category] || '📋'}
                        </span>
                        <span style={{ textTransform: 'capitalize' }}>
                          {cmp.category?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cmp.subject}
                      </td>
                      <td>{cmp.submittedBy?.name || 'Unknown'}</td>
                      <td>
                        <span className="badge" style={{ background: sts.bg, color: sts.color }}>{sts.label}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{timeAgo(cmp.createdAt)}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setSelected(cmp); setNewStatus(cmp.status); setResponse(cmp.officerResponse || ''); }}
                        >
                          Respond
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

      {/* Respond Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Respond to Complaint</h2>
            <p className="modal-subtitle">
              {CATEGORY_ICONS[selected.category] || '📋'} {selected.subject}
            </p>
            <div style={{
              background: 'var(--bg-light)', borderRadius: 10, padding: '14px 16px',
              marginBottom: 20, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6,
            }}>
              {selected.description}
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Officer Response</label>
              <textarea
                className="form-input"
                style={{ height: 100, resize: 'vertical', paddingTop: 10 }}
                placeholder="Enter your official response…"
                value={response}
                onChange={e => setResponse(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Update Status</label>
              <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={updating} onClick={handleUpdate}>
                {updating ? 'Saving…' : 'Submit Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

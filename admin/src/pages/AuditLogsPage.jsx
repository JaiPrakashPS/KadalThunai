import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import styles from './DataPage.module.css';

const timeAgo = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
};

const METHOD_COLOR = {
  GET:    '#3B82F6',
  POST:   '#10B981',
  PUT:    '#F59E0B',
  PATCH:  '#8B5CF6',
  DELETE: '#EF4444',
};

export default function AuditLogsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [search, setSearch]   = useState('');
  const LIMIT = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      const res = await api.get('/admin/audit-logs', { params });
      const data = res.data;
      setRecords(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>🔍 Audit Logs</h1>
          <p className={styles.pageSubtitle}>{total.toLocaleString()} total log entries</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            className="form-input"
            placeholder="Search logs…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 240 }}
          />
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h2 className="empty-title">No audit logs found</h2>
          <p className="empty-desc">System activity will appear here as users interact with the platform.</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Action / Path</th>
                  <th>User</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {records.map((log, i) => {
                  const mcolor = METHOD_COLOR[log.method] || '#64748B';
                  return (
                    <tr key={log._id || i}>
                      <td>
                        <span className="badge" style={{ background: mcolor + '22', color: mcolor, fontFamily: 'monospace' }}>
                          {log.method || 'GET'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.action || log.path || '—'}
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{log.userId?.name || 'System'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.userId?.role || ''}</div>
                      </td>
                      <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {log.ipAddress || '—'}
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: log.statusCode >= 400 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                          color: log.statusCode >= 400 ? '#EF4444' : '#10B981',
                        }}>
                          {log.statusCode || 200}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{timeAgo(log.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {total > LIMIT && (
            <div className="pagination">
              <span className="pagination-info">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}
              </span>
              <div className="pagination-btns">
                <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <button className="page-btn" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

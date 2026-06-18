import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import styles from './DataPage.module.css';

const TYPES   = ['info', 'warning', 'alert', 'scheme', 'weather', 'general'];
const ROLES   = ['all', 'fisherman', 'officer'];
const PRIORITY = ['low', 'medium', 'high', 'critical'];

export default function NotificationsPage() {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState({ title: '', body: '', type: 'info', targetRole: 'all', priority: 'medium' });
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { limit: 30 } });
      setRecords(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!form.title || !form.body) return;
    setSending(true);
    try {
      await api.post('/notifications/broadcast', form);
      setSent(`Notification "${form.title}" broadcast successfully!`);
      setShowModal(false);
      setForm({ title: '', body: '', type: 'info', targetRole: 'all', priority: 'medium' });
      load();
      setTimeout(() => setSent(''), 4000);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to broadcast notification');
    } finally {
      setSending(false);
    }
  };

  const typeColor = (type) => {
    if (type === 'alert' || type === 'warning') return '#EF4444';
    if (type === 'scheme') return '#10B981';
    if (type === 'weather') return '#3B82F6';
    if (type === 'info') return '#F59E0B';
    return '#64748B';
  };

  const priorityBadge = (p) => {
    const map = { critical: 'badge-danger', high: 'badge-warning', medium: 'badge-info', low: '' };
    return map[p] || '';
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>🔔 Broadcast Notifications</h1>
          <p className={styles.pageSubtitle}>{records.length} recent notifications</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>📢 Send Broadcast</button>
      </div>

      {sent && (
        <div style={{
          background: 'rgba(16,185,129,0.15)', border: '1px solid #10B981', borderRadius: 10,
          padding: '14px 18px', color: '#10B981', fontWeight: 600, fontSize: 14,
        }}>
          ✅ {sent}
        </div>
      )}

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <h2 className="empty-title">No notifications sent yet</h2>
          <p className="empty-desc">Broadcast messages to fishermen and officers.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>📢 Send First Broadcast</button>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Message</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Priority</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {records.map(n => (
                  <tr key={n._id}>
                    <td style={{ fontWeight: 600 }}>{n.title}</td>
                    <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {n.body}
                    </td>
                    <td>
                      <span className="badge" style={{ background: typeColor(n.type) + '22', color: typeColor(n.type), textTransform: 'capitalize' }}>
                        {n.type}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{n.targetRole || 'all'}</td>
                    <td>
                      <span className={`badge ${priorityBadge(n.priority)}`} style={{ textTransform: 'capitalize' }}>
                        {n.priority || 'medium'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">📢 Send Broadcast</h2>
            <p className="modal-subtitle">This will be sent to all selected users via push notification</p>
            <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notification title" />
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-input" style={{ height: 80, paddingTop: 10, resize: 'vertical' }} required value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Enter the broadcast message…" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Target Role</label>
                  <select className="form-select" value={form.targetRole} onChange={e => setForm(f => ({ ...f, targetRole: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r === 'all' ? 'Everyone' : r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITY.map(p => <option key={p} value={p} style={{ textTransform: 'capitalize' }}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{
                background: 'var(--bg-light)', borderRadius: 10, padding: '12px 16px',
                border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)',
              }}>
                <strong style={{ color: 'var(--text)' }}>Preview:</strong> [{form.priority.toUpperCase()}] <strong>{form.title}</strong> — {form.body || '…'}
              </div>
              <div className="modal-footer" style={{ marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : '📢 Broadcast'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

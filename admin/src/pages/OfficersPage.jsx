import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const INITIAL_FORM = {
  name: '', email: '', password: '', phone: '',
  designation: 'Fisheries Inspector', district: '', badgeNumber: '', preferredLanguage: 'ta',
};

const DESIGNATIONS = ['Fisheries Inspector', 'Senior Fisheries Inspector', 'Assistant Director', 'Deputy Director', 'District Fisheries Officer'];
const DISTRICTS = ['Chennai', 'Tiruvallur', 'Kancheepuram', 'Chengalpattu', 'Villupuram', 'Cuddalore', 'Nagapattinam', 'Thanjavur', 'Tiruvarur', 'Pudukkottai', 'Ramanathapuram', 'Thoothukudi', 'Tirunelveli', 'Kanyakumari'];

export default function OfficersPage() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const loadOfficers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/officers');
      setOfficers(res.data.data || []);
    } catch (e) {
      console.error('Load officers failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOfficers(); }, [loadOfficers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.email || !form.password) {
      setFormError('Name, email and password are required.');
      return;
    }
    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    try {
      setFormLoading(true);
      await api.post('/admin/officers', form);
      setSuccess(`Officer "${form.name}" created successfully!`);
      setShowModal(false);
      setForm(INITIAL_FORM);
      loadOfficers();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to create officer.');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStatus = async (officer) => {
    try {
      await api.put(`/admin/users/${officer._id}/status`, { isActive: !officer.isActive });
      loadOfficers();
    } catch (e) {
      alert('Failed to update status.');
    }
  };

  const filtered = officers.filter(o =>
    !search || o.name?.toLowerCase().includes(search.toLowerCase()) || o.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Officer Management</h1>
          <p className="page-subtitle">Create and manage fisheries officer accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setFormError(''); setForm(INITIAL_FORM); }}>
          ➕ Create Officer
        </button>
      </div>

      {/* Success Banner */}
      {success && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '12px 18px', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          ✅ {success}
        </div>
      )}

      {/* Stats row */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-glow)' }}>🎖️</div>
          <div className="stat-info">
            <div className="stat-value">{officers.length}</div>
            <div className="stat-label">Total Officers</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-bg)' }}>✅</div>
          <div className="stat-info">
            <div className="stat-value">{officers.filter(o => o.isActive !== false).length}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--danger-bg)' }}>🚫</div>
          <div className="stat-info">
            <div className="stat-value">{officers.filter(o => o.isActive === false).length}</div>
            <div className="stat-label">Suspended</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <input
              className="form-input"
              placeholder="🔍  Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-ghost btn-sm" onClick={loadOfficers}>↻ Refresh</button>
          </div>

          {loading ? (
            <div className="loading-wrap"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎖️</div>
              <div className="empty-title">No officers found</div>
              <div className="empty-desc">Create the first officer account using the button above.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Language</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((officer, idx) => (
                    <tr key={officer._id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0 }}>
                            {(officer.name || 'O')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{officer.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fisheries Officer</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{officer.email}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{officer.phone || '—'}</td>
                      <td>
                        <span className={`badge ${officer.preferredLanguage === 'ta' ? 'badge-warning' : 'badge-info'}`}>
                          {officer.preferredLanguage === 'ta' ? 'தமிழ்' : 'EN'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${officer.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                          {officer.isActive !== false ? '● Active' : '● Suspended'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(officer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${officer.isActive !== false ? 'btn-ghost' : 'btn-success'}`}
                          onClick={() => toggleStatus(officer)}
                          style={{ fontSize: 12 }}
                        >
                          {officer.isActive !== false ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Officer Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">🎖️ Create Officer Account</div>
            <div className="modal-subtitle">Officer can login to the KadalThunai mobile app after creation.</div>

            {formError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--danger)', fontSize: 13, marginBottom: 20 }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" placeholder="Officer name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="Phone number" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-input" type="email" placeholder="officer@fisheries.gov.in" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>

              <div className="form-group">
                <label className="form-label">Password * (min 8 chars)</label>
                <input className="form-input" type="password" placeholder="Set a strong password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <select className="form-select" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}>
                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">District</label>
                  <select className="form-select" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))}>
                    <option value="">Select district</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Badge Number</label>
                  <input className="form-input" placeholder="e.g. TN-FISH-001" value={form.badgeNumber} onChange={e => setForm(f => ({ ...f, badgeNumber: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Preferred Language</label>
                  <select className="form-select" value={form.preferredLanguage} onChange={e => setForm(f => ({ ...f, preferredLanguage: e.target.value }))}>
                    <option value="ta">தமிழ் (Tamil)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={formLoading}>
                  {formLoading ? '⏳ Creating...' : '✅ Create Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

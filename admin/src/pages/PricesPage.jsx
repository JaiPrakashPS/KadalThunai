import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import styles from './DataPage.module.css';

const FISH_SPECIES = [
  'Tuna', 'Mackerel', 'Sardine', 'Pomfret', 'Prawn', 'Crab',
  'Squid', 'Barracuda', 'Snapper', 'Grouper', 'Kingfish', 'Hilsa',
];

const INITIAL_FORM = { species: '', pricePerKg: '', marketName: '', unit: 'kg', grade: 'A' };

export default function PricesPage() {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]         = useState(INITIAL_FORM);
  const [saving, setSaving]     = useState(false);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/market-prices', { params: { limit: 100 } });
      setRecords(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditItem(null); setForm(INITIAL_FORM); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      species: item.species || '',
      pricePerKg: item.pricePerKg || '',
      marketName: item.marketName || '',
      unit: item.unit || 'kg',
      grade: item.grade || 'A',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.species || !form.pricePerKg) return;
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/market-prices/${editItem._id}`, form);
      } else {
        await api.post('/market-prices', form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to save price');
    } finally {
      setSaving(false);
    }
  };

  const handleFetchLive = async () => {
    setFetching(true);
    try {
      await api.post('/market-prices/fetch-live');
      load();
    } catch {
      alert('Live price fetch failed. Check DataGov API key.');
    } finally {
      setFetching(false);
    }
  };

  const filtered = records.filter(r =>
    !search || r.species?.toLowerCase().includes(search.toLowerCase()) ||
    r.marketName?.toLowerCase().includes(search.toLowerCase())
  );

  const gradeColor = (g) => {
    if (g === 'A') return '#10B981';
    if (g === 'B') return '#F59E0B';
    return '#64748B';
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>💰 Fish Market Prices</h1>
          <p className={styles.pageSubtitle}>{records.length} price entries</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            className="form-input"
            placeholder="Search fish/market…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
          <button className="btn btn-ghost" onClick={handleFetchLive} disabled={fetching}>
            {fetching ? '⏳ Fetching…' : '🔄 Fetch Live'}
          </button>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Price</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <h2 className="empty-title">No price data found</h2>
          <p className="empty-desc">Add fish market prices or fetch live data.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={handleFetchLive}>🔄 Fetch Live Prices</button>
            <button className="btn btn-primary" onClick={openCreate}>+ Add Price</button>
          </div>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Species</th>
                  <th>Grade</th>
                  <th>Price / kg</th>
                  <th>Market</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600 }}>🐟 {item.species}</td>
                    <td>
                      <span className="badge" style={{ background: gradeColor(item.grade) + '22', color: gradeColor(item.grade) }}>
                        Grade {item.grade || 'A'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#10B981', fontSize: 16 }}>
                      ₹{item.pricePerKg?.toLocaleString('en-IN')} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>/{item.unit || 'kg'}</span>
                    </td>
                    <td>{item.marketName || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editItem ? 'Edit Price' : 'Add Fish Price'}</h2>
            <p className="modal-subtitle">Set the current market price for a species</p>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Species *</label>
                  <select className="form-select" value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))} required>
                    <option value="">Select species</option>
                    {FISH_SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Price per kg (₹) *</label>
                  <input className="form-input" type="number" min="0" step="0.5" required value={form.pricePerKg} onChange={e => setForm(f => ({ ...f, pricePerKg: e.target.value }))} placeholder="e.g. 250" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Market Name</label>
                  <input className="form-input" value={form.marketName} onChange={e => setForm(f => ({ ...f, marketName: e.target.value }))} placeholder="e.g. Chennai Kasimedu" />
                </div>
                <div className="form-group">
                  <label className="form-label">Grade</label>
                  <select className="form-select" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                    <option value="A">Grade A (Premium)</option>
                    <option value="B">Grade B (Standard)</option>
                    <option value="C">Grade C (Economy)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editItem ? 'Update' : 'Add Price'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

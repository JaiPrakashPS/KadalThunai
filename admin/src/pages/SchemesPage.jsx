import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import styles from './DataPage.module.css';

const CATEGORIES = ['welfare', 'training', 'insurance', 'equipment', 'subsidy', 'other'];
const INITIAL_FORM = {
  title: '', titleTamil: '', description: '', descriptionTamil: '',
  category: 'welfare', eligibility: '', applicationUrl: '', isActive: true,
};

export default function SchemesPage() {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]         = useState(INITIAL_FORM);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/schemes', { params: { limit: 50 } });
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
      title: item.title || '',
      titleTamil: item.titleTamil || '',
      description: item.description || '',
      descriptionTamil: item.descriptionTamil || '',
      category: item.category || 'welfare',
      eligibility: item.eligibility || '',
      applicationUrl: item.applicationUrl || '',
      isActive: item.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/schemes/${editItem._id}`, form);
      } else {
        await api.post('/schemes', form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to save scheme');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      await api.put(`/schemes/${item._id}`, { isActive: !item.isActive });
      load();
    } catch {}
  };

  const filtered = records.filter(r =>
    !search || r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>📜 Government Schemes</h1>
          <p className={styles.pageSubtitle}>{records.length} schemes published</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            className="form-input"
            placeholder="Search schemes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <button className="btn btn-primary" onClick={openCreate}>+ New Scheme</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📜</div>
          <h2 className="empty-title">No schemes found</h2>
          <p className="empty-desc">Create the first government scheme.</p>
          <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 16 }}>+ Add Scheme</button>
        </div>
      ) : (
        <div className={styles.schemeGrid}>
          {filtered.map(item => (
            <div key={item._id} className={styles.schemeCard} style={{ opacity: item.isActive ? 1 : 0.6 }}>
              <div className={styles.schemeCardTop}>
                <div>
                  <span className="badge badge-info" style={{ marginBottom: 8, display: 'inline-flex', textTransform: 'capitalize' }}>
                    {item.category}
                  </span>
                  <h3 className={styles.schemeTitle}>{item.title}</h3>
                  {item.titleTamil && <p className={styles.schemeTitleTa}>{item.titleTamil}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <button
                    className={`btn btn-sm ${item.isActive ? 'btn-success' : 'btn-ghost'}`}
                    onClick={() => toggleActive(item)}
                    style={{ fontSize: 11, padding: '4px 12px' }}
                  >
                    {item.isActive ? '● Active' : '○ Inactive'}
                  </button>
                </div>
              </div>
              <p className={styles.schemeDesc}>{item.description}</p>
              {item.eligibility && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  <strong style={{ color: 'var(--secondary)' }}>Eligibility:</strong> {item.eligibility}
                </p>
              )}
              <div className={styles.schemeFooter}>
                {item.applicationUrl && (
                  <a href={item.applicationUrl} target="_blank" rel="noopener noreferrer" className={styles.mapsLink}>
                    🔗 Apply
                  </a>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editItem ? 'Edit Scheme' : 'New Government Scheme'}</h2>
            <p className="modal-subtitle">Fill in both English and Tamil for bilingual support</p>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Title (English) *</label>
                  <input className="form-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Scheme name in English" />
                </div>
                <div className="form-group">
                  <label className="form-label">Title (Tamil)</label>
                  <input className="form-input" value={form.titleTamil} onChange={e => setForm(f => ({ ...f, titleTamil: e.target.value }))} placeholder="திட்ட பெயர்" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description (English)</label>
                <textarea className="form-input" style={{ height: 80, paddingTop: 10, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the scheme…" />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Tamil)</label>
                <textarea className="form-input" style={{ height: 80, paddingTop: 10, resize: 'vertical' }} value={form.descriptionTamil} onChange={e => setForm(f => ({ ...f, descriptionTamil: e.target.value }))} placeholder="திட்டத்தை விவரிக்கவும்…" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Eligibility</label>
                  <input className="form-input" value={form.eligibility} onChange={e => setForm(f => ({ ...f, eligibility: e.target.value }))} placeholder="Who is eligible?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Application Link</label>
                  <input className="form-input" type="url" value={form.applicationUrl} onChange={e => setForm(f => ({ ...f, applicationUrl: e.target.value }))} placeholder="https://…" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <label htmlFor="isActive" style={{ fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer' }}>Active (visible to fishermen)</label>
              </div>
              <div className="modal-footer" style={{ marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editItem ? 'Save Changes' : 'Create Scheme'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

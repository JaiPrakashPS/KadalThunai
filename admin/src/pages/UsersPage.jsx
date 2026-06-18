import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import styles from './DataPage.module.css';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (role) params.role = role;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch (e) { console.warn(e.message); }
    finally { setLoading(false); }
  }, [page, search, role]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (u) => {
    try {
      await api.put(`/admin/users/${u._id}/status`, { isActive: !u.isActive });
      load();
    } catch (e) { alert(e.response?.data?.message || 'Update failed'); }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>User Management</h2>
        <span className={styles.pageCount}>{pagination.total || 0} total</span>
      </div>
      <div className={styles.filters}>
        <input className={styles.searchInput} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name or email..." />
        <select className={styles.select} value={role} onChange={e => { setRole(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="fisherman">Fisherman</option>
          <option value="officer">Officer</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {loading ? <div className={styles.loading}>Loading...</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>
              <th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Verified</th><th>Action</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td className={styles.nameCell}>
                    <div className={styles.avatar}>{u.name?.[0]?.toUpperCase()}</div>
                    <span>{u.name}</span>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td><span className={`${styles.badge} ${styles[u.role]}`}>{u.role}</span></td>
                  <td><span className={`${styles.badge} ${u.isActive ? styles.active : styles.inactive}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>{u.isVerified ? '✅' : '❌'}</td>
                  <td>
                    <button className={`${styles.btn} ${u.isActive ? styles.btnDanger : styles.btnSuccess}`} onClick={() => toggleStatus(u)}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pagination.pages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrevPage}>← Prev</button>
          <span className={styles.pageInfo}>Page {page} of {pagination.pages}</span>
          <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNextPage}>Next →</button>
        </div>
      )}
    </div>
  );
}

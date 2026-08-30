import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/admin.css';

function DashboardAdmin(){
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [filterTanggal, setFilterTanggal] = useState('');
  const filterTanggalRef = React.useRef('');
  const [filterAksi, setFilterAksi] = useState('');
  const filterAksiRef = React.useRef('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showAdd, setShowAdd] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState({ username:'', password:'', role:'kasir' });
  const token = localStorage.getItem('adminToken');

  useEffect(()=>{
    if (!token) return navigate('/admin/login');
    fetchUsers();
    fetchActivityLog();
    fetchOnlineUsers();
    // poll online users & activity log periodically so admin sees updates shortly after logout
      const interval = setInterval(() => {
        fetchOnlineUsers();
        fetchActivityLog(filterTanggalRef.current || '', filterAksiRef.current || '');
      }, 8000);

    const onVisible = () => {
      fetchOnlineUsers();
      fetchActivityLog(filterTanggal || '', filterAksi || '');
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) onVisible(); });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const fetchOnlineUsers = async () => {
  try {
    const tokenLocal = localStorage.getItem('adminToken');
    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/online-users`, {
      headers: { 'Authorization': `Bearer ${tokenLocal}` }
    });
    const data = await res.json();
    setOnlineUsers(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('Error fetch online users:', err);
    setOnlineUsers([]);
  }
};

  // Fungsi ini mengambil daftar user dari backend untuk ditampilkan di dashboard admin.
  const fetchUsers = async () => {
    try {
      const tokenLocal = localStorage.getItem('adminToken');
      if (!tokenLocal) {
        navigate('/admin/login');
        return;
      }
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${tokenLocal}` }
      });
      if (res.status === 401 || res.status === 403) {
        // invalid token or not admin
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
        return;
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users || data.data || []);
    } catch (err) {
      console.error('Error fetch users:', err);
      setUsers([]);
    }
  };

  // Fungsi ini mengambil log aktivitas berdasarkan tanggal dan tipe aksi tertentu untuk ditampilkan ke admin.
  const fetchActivityLog = async (tanggal = '', aksi = '') => {
    try {
      const token = localStorage.getItem('adminToken');
      
      let tanggalParam = tanggal;
      if (!tanggalParam) {
        // Ambil tanggal hari ini sesuai timezone lokal in YYYY-MM-DD
        tanggalParam = new Date().toLocaleDateString('en-CA'); // e.g. 2026-08-31
      }
      
      const params = new URLSearchParams({ tanggal: tanggalParam });
      if (aksi) params.set('aksi', aksi);
      
      console.log('Fetching log untuk tanggal:', tanggalParam, 'aksi:', aksi || 'semua');
      
      const url = `${process.env.REACT_APP_API_URL}/api/admin/activity-log?${params.toString()}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const text = await res.text().catch(()=>'<no body>');
        console.error('Activity-log response not OK', res.status, text);
        setActivityLog([]);
        return;
      }
      let data;
      try {
        data = await res.json();
      } catch (e) {
        const text = await res.text().catch(()=>'<no body>');
        console.error('Activity-log invalid JSON response', text);
        setActivityLog([]);
        return;
      }
      console.log('Log data received:', Array.isArray(data) ? data.length : 0, 'rows');
      const arr = Array.isArray(data) ? data : [];
      arr.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
      setActivityLog(arr);
    } catch (err) {
      console.error('Error fetch activity log:', err);
      setActivityLog([]);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTanggal, filterAksi]);

  // saat filter tanggal berubah, panggil fetchActivityLog
  const handleFilterTanggal = (e) => {
    let val = e.target.value;
    // normalize common formats to YYYY-MM-DD (en-CA) for both UI and API
    let normalized = val;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
      // MM/DD/YYYY -> YYYY-MM-DD
      const parts = val.split('/');
      normalized = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    } else if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(val)) {
      // try Date parse fallback
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) normalized = d.toISOString().slice(0, 10);
    }
    setFilterTanggal(normalized);
    filterTanggalRef.current = normalized;
    fetchActivityLog(normalized, filterAksiRef.current || '');
  };

  const handleFilterAksi = (e) => {
    const val = e.target.value;
    setFilterAksi(val);
    filterAksiRef.current = val;
    fetchActivityLog(filterTanggalRef.current || '', val);
  };

  const handleResetFilter = () => {
    setFilterTanggal('');
    setFilterAksi('');
    filterTanggalRef.current = '';
    filterAksiRef.current = '';
    fetchActivityLog('', ''); // kembali ke hari ini dan semua aksi
  };

  const formatWaktu = (waktu) => {
    try {
      const d = new Date(waktu);
      const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const namaHari = hari[d.getDay()];
      const tgl = d.getDate();
      const bln = bulan[d.getMonth()];
      const thn = d.getFullYear();
      const jam = String(d.getHours()).padStart(2, '0');
      const menit = String(d.getMinutes()).padStart(2, '0');
      return `${namaHari}, ${tgl} ${bln} ${thn} • ${jam}:${menit}`;
    } catch (err) {
      return waktu;
    }
  };

  const handleLogout = ()=>{
    localStorage.removeItem('adminToken');
    navigate('/');
  };

  // delete flow using modal: keep API call but open confirmation modal first
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // no extra confirmation modal — actions execute immediately

  const openDeleteConfirm = (id, nama) => {
    setDeleteTarget({ id, nama });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const tokenLocal = localStorage.getItem('adminToken');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenLocal}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({message:'Gagal'}));
        alert('Gagal hapus user: ' + (err.message || res.statusText));
        return;
      }
      await fetchUsers();
      await fetchOnlineUsers();
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      setSuccessMessage('User berhasil dihapus!');
      setShowSuccess(true);
    } catch (err) {
      console.error('Error hapus user:', err);
    }
  };

  // reset password flow using modal (matches checkout-success model)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  const openResetModal = (id, nama) => {
    setResetTarget({ id, nama });
    setResetPasswordValue('');
    setShowResetModal(true);
  };

  const submitResetPassword = async () => {
    if (!resetTarget || !resetPasswordValue) return alert('Password tidak boleh kosong');
    try {
      const tokenLocal = localStorage.getItem('adminToken');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/users/${resetTarget.id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokenLocal}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: resetPasswordValue })
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Gagal reset password: ' + (data.message || res.statusText));
        return;
      }
      setShowResetModal(false);
      setResetTarget(null);
      setResetPasswordValue('');
      setSuccessMessage('Password berhasil direset!');
      setShowSuccess(true);
      fetchOnlineUsers();
    } catch (err) {
      console.error('Error reset password:', err);
    }
  };

  const submitAdd = async (e)=>{
    e.preventDefault();
    try{
      const tokenLocal = localStorage.getItem('adminToken');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${tokenLocal}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Gagal membuat user: ' + (data.message || res.statusText));
        return;
      }
      setShowAdd(false);
      setForm({ username:'', password:'', role:'kasir' });
      await fetchUsers();
      await fetchOnlineUsers();
      setSuccessMessage('User berhasil dibuat');
      setShowSuccess(true);
    }catch(err){ console.error(err); }
  };

  const totalKasir = users.filter(u=>u.role==='kasir').length;
  const totalOwner = users.filter(u=>u.role==='owner' || u.role==='pemilik').length;
  const onlineCount = onlineUsers.length;

  // onlineUsers now contains latest-activity rows; use a.status in logs to determine online/offline

  return (
    <div className="admin-container">
      <header className="dashboard-header">
        <div className="logo-section">
          <img src="/logimichi.jpg" alt="Logo" className="logo-img" />
          <span className="logo-title">ADMIN</span>
        </div>
        <button 
          onClick={handleLogout}
          className="admin-logout"
          style={{
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          LogOut
        </button>
      </header>
      <main className="admin-main">
        <div className="admin-sticky-top">
          <h1 className="admin-title">DASHBOARD ADMIN</h1>

          <div className="admin-summary-row">
            <div className="admin-stat-box">
              <div className="admin-stat-icon"><img src="/user-circle.png" alt="Total Kasir" /></div>
              <div className="admin-stat-content">
                <div className="admin-stat-label">Total User Kasir</div>
                <div className="admin-stat-value">{totalKasir}</div>
              </div>
            </div>
            <div className="admin-stat-box">
              <div className="admin-stat-icon"><img src="/user-circle.png" alt="Total Owner" /></div>
              <div className="admin-stat-content">
                <div className="admin-stat-label">Total User Pemilik</div>
                <div className="admin-stat-value">{totalOwner}</div>
              </div>
            </div>
            <div className="admin-stat-box">
              <div className="admin-stat-icon"><img src="/group.png" alt="Sedang Online" /></div>
              <div className="admin-stat-content">
                <div className="admin-stat-label">Sedang Online</div>
                <div className="admin-stat-value">{onlineCount}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-scroll-content">
          <section className="admin-table-card">
            <div className="admin-table-header">
              <div className="admin-table-title">Daftar User</div>
              <div>
                <button className="admin-tambah-btn" onClick={()=>setShowAdd(true)}>+ Tambah User</button>
              </div>
              {showResetModal && resetTarget && (
                <div className="popup-overlay" onClick={()=>setShowResetModal(false)}>
                  <div className="popup-menu-wrapper" onClick={e=>e.stopPropagation()}>
                    <div className="popup-menu-header">
                      <span>Reset Password</span>
                      <button className="popup-close" onClick={()=>setShowResetModal(false)}>✕</button>
                    </div>
                    <div className="popup-menu-body">
                      <p>Masukkan password baru untuk <strong>{resetTarget.nama}</strong></p>
                      <input type="password" className="popup-input" value={resetPasswordValue} onChange={e=>setResetPasswordValue(e.target.value)} />
                    </div>
                    <div className="popup-menu-footer">
                            <div className="popup-menu-footer center">
                              <div style={{display:'flex',gap:12}}>
                                <button className="btn-batal" onClick={()=>setShowResetModal(false)}>Batal</button>
                                <button className="popup-save-btn" onClick={submitResetPassword}>Reset</button>
                              </div>
                            </div>
                    </div>
                  </div>
                </div>
              )}

              {showDeleteConfirm && deleteTarget && (
                <div className="popup-overlay" onClick={()=>setShowDeleteConfirm(false)}>
                  <div className="popup-menu-wrapper" onClick={e=>e.stopPropagation()}>
                    <div className="popup-menu-header">
                      <span>Hapus User</span>
                      <button className="popup-close" onClick={()=>setShowDeleteConfirm(false)}>✕</button>
                    </div>
                    <div className="popup-menu-body">
                      <p>Yakin ingin menghapus user <strong>{deleteTarget.nama}</strong>?</p>
                    </div>
                    <div className="popup-menu-footer center">
                      <div style={{display:'flex',gap:12}}>
                        <button className="btn-batal" onClick={()=>setShowDeleteConfirm(false)}>Batal</button>
                        <button className="popup-save-btn" onClick={confirmDelete}>Hapus</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr><th>No</th><th>Username</th><th>Role</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {users.map((u,i)=> (
                    <tr key={u.id}>
                      <td>{i+1}</td>
                      <td>{u.username}</td>
                      <td>{u.role === 'owner' ? 'Pemilik' : u.role}</td>
                      <td>
                        <button 
                          onClick={() => openResetModal(u.id, u.username)}
                          className="btn-reset"
                        >
                          Reset Password
                        </button>
                        <button className="btn-hapus" onClick={()=>openDeleteConfirm(u.id, u.username)}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-log-card">
            <div className="admin-log-header">
              <span className="admin-log-title">Log Aktivitas User</span>
              <div style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
                <label className="admin-filter-label">Filter Tanggal:</label>
                <input
                  type="date"
                  className="admin-filter-input"
                  value={filterTanggal}
                  onChange={handleFilterTanggal}
                />
                <label className="admin-filter-label">Filter Aksi:</label>
                <select
                  className="admin-filter-input"
                  value={filterAksi}
                  onChange={handleFilterAksi}
                >
                  <option value="">Semua</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="transaksi">Transaksi</option>
                  <option value="pengeluaran">Pengeluaran</option>
                  <option value="pemasukan">Pemasukan</option>
                  <option value="menu">Menu</option>
                  <option value="export">Export</option>
                </select>
                {(filterTanggal || filterAksi) && (
                  <button className="admin-filter-reset" onClick={handleResetFilter}>Reset</button>
                )}
              </div>
            </div>

            <div className="admin-log-wrapper">
              <table className="admin-table">
                <thead><tr><th>No</th><th>Nama</th><th>Role</th><th>Aksi</th><th>Waktu</th></tr></thead>
                <tbody>
                {(() => {
                  const filteredLog = filterTanggal
                    ? activityLog.filter(item => {
                        // compare using local date (matching displayed waktu)
                        try {
                          const d = new Date(item.waktu);
                          const itemDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                          return itemDate === filterTanggal;
                        } catch (e) {
                          return false;
                        }
                      })
                    : activityLog;
                  const totalPages = Math.max(1, Math.ceil(filteredLog.length / itemsPerPage));
                  const paginatedLog = filteredLog.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                  return (
                    <>
                      {paginatedLog.map((a,i)=>(
                        <tr key={(currentPage-1)*itemsPerPage + i}>
                          <td>{(currentPage-1)*itemsPerPage + i + 1}</td>
                          <td>{a.nama}</td>
                          <td>{a.role === 'owner' ? 'Pemilik' : a.role}</td>
                          <td>
  {(() => {
    const aksi = (a.aksi || '').toLowerCase();
    let style = {
      display: 'inline-block',
      padding: '3px 12px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '700',
      whiteSpace: 'nowrap',
      overflow: 'visible',
      maxWidth: 'none',
    };
    if (aksi === 'login') {
      style.background = '#DCFCE7'; style.color = '#065F46';
    } else if (aksi === 'logout') {
      style.background = '#F3F4F6'; style.color = '#5F5E5A';
    } else if (aksi.includes('transaksi')) {
      style.background = '#E6F1FB'; style.color = '#185FA5';
    } else if (aksi.includes('pengeluaran')) {
      style.background = '#FCEBEB'; style.color = '#A32D2D';
    } else if (aksi.includes('pemasukan')) {
      style.background = '#EAF3DE'; style.color = '#3B6D11';
    } else if (aksi.includes('export')) {
      style.background = '#FAEEDA'; style.color = '#854F0B';
    } else {
      style.background = '#EEEDFE'; style.color = '#3C3489';
    }
    return <span style={style}>{a.aksi}</span>;
  })()}
</td>
                          <td>{formatWaktu(a.waktu)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={5} style={{border: 'none', padding: 0}}>
                          <div className="admin-pagination">
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                              disabled={currentPage === 1}
                              className="admin-page-btn"
                            >
                              ←
                            </button>
                            <span className="admin-page-info">{currentPage} / {totalPages}</span>
                            <button
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                              disabled={currentPage === totalPages}
                              className="admin-page-btn"
                            >
                              →
                            </button>
                          </div>
                        </td>
                      </tr>
                    </>
                  );
                })()}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {showAdd && (
        <div className="popup-overlay" onClick={() => setShowAdd(false)}>
          <div className="popup-menu-wrapper" onClick={e => e.stopPropagation()}>
            <div className="popup-menu-header">
              <span>Tambah User</span>
              <button className="popup-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="popup-menu-body">
              <form className="popup-form" onSubmit={submitAdd}>
                <label>Username</label>
                <input className="popup-input" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} />
                <label>Password</label>
                <input type="password" className="popup-input" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
                <label>Role</label>
                <select className="popup-input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                  <option value="kasir">Kasir</option>
                  <option value="owner">Pemilik</option>
                </select>
              </form>
            </div>
              <div className="popup-menu-footer center">
                <div className="popup-save-row" style={{display:'flex',gap:12}}>
                  <button type="button" className="btn-batal" onClick={()=>setShowAdd(false)}>Batal</button>
                  <button type="button" className="popup-save-btn" onClick={submitAdd}>Simpan</button>
                </div>
              </div>
          </div>
        </div>
      )}
      {showSuccess && (
        <div className="popup-overlay" onClick={()=>setShowSuccess(false)}>
          <div className="popup-menu-wrapper checkout-success" onClick={e=>e.stopPropagation()}>
            <div className="checkout-logo"><img src="/logimichi.jpg" alt="logo" /></div>
            <div style={{padding:'28px 28px 18px'}}>
              <h2 className="checkout-title">Berhasil</h2>
              <p className="checkout-sub">{successMessage}</p>
              <div className="popup-menu-footer center" style={{marginTop:12}}>
                <button className="popup-save-btn-oke" onClick={()=>setShowSuccess(false)}>Oke</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* no confirm modal — actions execute immediately */}
    </div>
  );
}

export default DashboardAdmin;

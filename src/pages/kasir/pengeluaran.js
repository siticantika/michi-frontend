import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/pengeluaran.css';
import '../../styles/PengeluaranPemilik.css';
import Navbar from '../../components/Navbar';

const API = process.env.REACT_APP_API_URL;

function Pengeluaran() {
  const navigate = useNavigate();
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [form, setForm] = useState({ keterangan: '', jumlah: '' });

  useEffect(() => {
    fetch(`${API}/api/pengeluaran`)
      .then(res => res.json())
      .then(data => {
        // Normalize response to an array
        if (Array.isArray(data)) setPengeluaranList(data);
        else if (data && Array.isArray(data.data)) setPengeluaranList(data.data);
        else setPengeluaranList([]);
      })
      .catch(err => {
        console.error('Gagal ambil pengeluaran:', err);
        setPengeluaranList([]);
      });
  }, []);

  const totalPengeluaran = Array.isArray(pengeluaranList)
    ? pengeluaranList.reduce((sum, p) => sum + (Number(p.jumlah) || 0), 0)
    : 0;

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.keterangan || !form.jumlah) return;

    try {
      const response = await fetch(`${API}/api/pengeluaran`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ keterangan: form.keterangan, jumlah: Number(form.jumlah) })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      await response.json();

      const res = await fetch(`${API}/api/pengeluaran`);
      const data = await res.json();
      if (Array.isArray(data)) setPengeluaranList(data);
      else if (data && Array.isArray(data.data)) setPengeluaranList(data.data);
      else setPengeluaranList([]);

      setForm({ keterangan: '', jumlah: '' });
      setShowPopup(false);

    } catch (err) {
      console.error('Gagal simpan pengeluaran:', err);
      alert('Gagal menyimpan pengeluaran: ' + err.message);
    }
  };

  const formatWaktu = (waktu) => {
    if (!waktu) return '';
    return waktu.slice(0, 5);
  };

  return (
    <div className="transaksi-container">
      <header className="dashboard-header">
        <div className="logo-section">
          <img src="/logimichi.jpg" alt="Logo Michi" className="logo-img" />
          <span className="logo-title">KASIR MICHI</span>
        </div>
        <Navbar />
      </header>

      <main className="pengeluaran-owner-bg">
        <h1 className="pengeluaran-main-title">PENGELUARAN HARI INI</h1>

        <div className="owner-wrapper" style={{ position: 'relative' }}>
          <div className="owner-summary-stats">
            <div className="stat-box">
              <span className="dashboardpemilik-stat-icon">💸</span>
              <div className="stat-content">
                <span className="dashboardpemilik-stat-label">Total Pengeluaran</span>
                <div className="stat-row">
                  <span className="stat-value orange">Rp {totalPengeluaran.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="stat-box">
              <span className="dashboardpemilik-stat-icon">🧾</span>
              <div className="stat-content">
                <span className="dashboardpemilik-stat-label">Jumlah Transaksi</span>
                <div className="stat-row">
                  <span className="stat-value">{pengeluaranList.length}</span>
                </div>
              </div>
            </div>

            <div className="stat-add-box">
              <button className="pengeluaran-add-btn" onClick={() => { setForm({ keterangan: '', jumlah: '' }); setShowPopup(true); }}>
                + Tambah Pengeluaran
              </button>
            </div>
          </div>
            <div className="laporan-table-wrapper">
              <div className="pengeluaran-table-box-pemilik transaksi-scroll">
                {pengeluaranList.length === 0 ? (
                  <div className="pengeluaran-empty">Belum ada pengeluaran hari ini.</div>
                ) : (
                  <div className="pengeluaran-card-list">
                    {pengeluaranList.map((row, idx) => (
                      <div className="pengeluaran-list-card-item" key={row.id || idx}>
                        <div className="pengeluaran-card-top">
                          <span className="pengeluaran-card-nomor">Pengeluaran {idx + 1}</span>
                          <span className="pengeluaran-card-amount">Rp {Number(row.jumlah).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="pengeluaran-card-bottom">
                          <div className="pengeluaran-card-left">
                            <span className="pengeluaran-card-icon">💸</span>
                            <span className="pengeluaran-card-name">{row.keterangan}</span>
                          </div>
                          <span className="pengeluaran-card-time">{formatWaktu(row.waktu)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

            </div>
          </div>
        </div>
      </main>

      {showPopup && (
        <div className="pemasukan-popup-bg">
          <div className="pemasukan-popup">
            <div className="pemasukan-popup-header">
              <span className="pemasukan-popup-title">Tambahkan Pengeluaran Baru</span>
              <button className="pemasukan-popup-close" onClick={() => setShowPopup(false)}>✕</button>
            </div>

            <form className="pemasukan-popup-form" onSubmit={handleSubmit}>
              <div className="pemasukan-popup-field">
                <label>Keterangan Pengeluaran</label>
                <input type="text" name="keterangan" placeholder="Contoh: Sendok" value={form.keterangan} onChange={handleChange} className="pemasukan-popup-input" />
              </div>

              <div className="pemasukan-popup-field">
                <label>Jumlah Pengeluaran</label>
                <input type="number" name="jumlah" placeholder="Contoh: 50000" value={form.jumlah} onChange={handleChange} className="pemasukan-popup-input" />
              </div>

              <button type="submit" className="pemasukan-popup-btn">💾 Simpan Pengeluaran</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Pengeluaran;

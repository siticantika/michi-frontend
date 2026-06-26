import React from 'react';
import '../../styles/transaksi.css';
import axios from 'axios';
import Navbar from '../../components/Navbar';

function Transaksi() {
  const API = process.env.REACT_APP_API_URL;
  const [transaksiList, setTransaksiList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [previewQris, setPreviewQris] = React.useState(null);
  const [openIndex, setOpenIndex] = React.useState(null);
  const [completedSet, setCompletedSet] = React.useState(new Set());

  // Bagian ini menghitung total pendapatan, total cash, dan total QRIS dari daftar transaksi yang sudah diterima dari backend.
  // Nilai ini dipakai untuk menampilkan ringkasan data di halaman riwayat pesanan.
  const totalPendapatan = transaksiList.reduce((sum, t) => sum + (t.total || 0), 0);
  const totalCash = transaksiList.filter(t => t.metode === 'cash').reduce((s, t) => s + (t.total || 0), 0);
  const totalQris = transaksiList.filter(t => t.metode === 'qris').reduce((s, t) => s + (t.total || 0), 0);

  // normalize items dari API ke bentuk array { nama, qty, harga, icon?, varian?, level? }
  const parseItems = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    // coba parse JSON string
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) { /* ignore */ }
    // fallback: format concatenated "nama|qty|harga;;nama2|qty|harga"
    try {
      return raw
        .toString()
        .split(';;')
        .map(it => {
          const [nama, qty, harga, icon, varian, level] = it.split('|');
          return {
            nama: nama?.trim() || '-',
            qty: Number(qty) || 0,
            harga: Number(harga) || 0,
            icon: icon || null,
            varian: varian || null,
            level: level || null
          };
        })
        .filter(i => i.nama && i.nama !== '-');
    } catch (e) {
      return [];
    }
  };

  React.useEffect(() => {
    const fetchTransaksi = async () => {
      try {
        const res = await axios.get(`${API}/transaksi`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        const normalized = (res.data || []).map(r => {
          const itemsRaw = r.items ?? r.detail ?? r.menu ?? r.menus;
          return { ...r, items: parseItems(itemsRaw) };
        });
        setTransaksiList(normalized);
        // init completed set from data (use id-based set to persist across pages)
        const doneIds = new Set((normalized.filter(t => t.selesai && Number(t.selesai) === 1).map(t => t.id)));
        setCompletedSet(doneIds);
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransaksi();
  }, []);

  if (loading) return <div className="loading-state">Loading...</div>;
  if (error) return <div className="error-state">Error: {error.message || 'Request failed'}</div>;

  return (
    <div className="transaksi-container">
      <header className="dashboard-header">
        <div className="logo-section">
          <img src="/logimichi.jpg" alt="Logo Michi" className="logo-img" />
          <span className="logo-title">KASIR MICHI</span>
        </div>
        <Navbar />
      </header>

      <main className="transaksi-main">
        <h1 className="transaksi-title">RIWAYAT PESANAN HARI INI</h1>

        <section className="transaksi-table-section">
          <div className="transaksi-wrapper">
            <div className="owner-summary-stats">
              <div className="stat-box">
                <span className="dashboardpemilik-stat-icon">💰</span>
                <div className="stat-content">
                  <span className="dashboardpemilik-stat-label">Total Cash</span>
                  <div className="stat-row">
                    <span className="stat-value">Rp {totalCash.toLocaleString('id-ID')}</span>
                    <span className="stat-transaksi">{transaksiList.filter(t => t.metode === 'cash').length} Transaksi</span>
                  </div>
                </div>
              </div>

              <div className="stat-box">
                <span className="dashboardpemilik-stat-icon">💳</span>
                <div className="stat-content">
                  <span className="dashboardpemilik-stat-label">Total QRIS</span>
                  <div className="stat-row">
                    <span className="stat-value">Rp {totalQris.toLocaleString('id-ID')}</span>
                    <span className="stat-transaksi">{transaksiList.filter(t => t.metode === 'qris').length} Transaksi</span>
                  </div>
                </div>
              </div>

              <div className="stat-box">
                <span className="dashboardpemilik-stat-icon">📊</span>
                <div className="stat-content">
                  <span className="dashboardpemilik-stat-label">Total Pendapatan</span>
                  <div className="stat-row">
                    <span className="stat-value">Rp {totalPendapatan.toLocaleString('id-ID')}</span>
                    <span className="stat-transaksi">{transaksiList.length} Transaksi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. SCROLL HANYA AREA KARTU INI SAJA */}
            <div className="transaksi-scroll">
              <div className="transaksi-card-list">
                {transaksiList.length === 0 ? (
                  <div className="empty-transaksi">Belum Ada Transaksi Hari Ini 🙂</div>
                ) : (
                  transaksiList.map((row, idx) => {
                    const isOpen = openIndex === idx;
                    const itemsToShow = isOpen ? (row.items || []) : ((row.items || []).slice(0, 4));
                    const isDone = completedSet.has(row.id);
                    return (
                    <div className={`transaksi-card ${isDone ? 'completed' : ''}`} key={row.id || idx}>

  {/* HEADER */}
  <div className="card-top">
    <div className="card-top-left">
      <div className="transaksi-title">Transaksi {idx + 1}</div>
        <label className="transaksi-done-toggle">
        <input
          type="checkbox"
          checked={isDone}
          onChange={async () => {
            // optimistic update
            setCompletedSet(prev => {
              const next = new Set(prev);
              if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
              return next;
            });
            try {
              await axios.patch(`${API}/transaksi/${row.id}/selesai`)
            } catch (err) {
              // revert on error
              setCompletedSet(prev => {
                const next = new Set(prev);
                if (isDone) next.add(row.id); else next.delete(row.id);
                return next;
              });
              console.error('Gagal update status selesai', err);
            }
          }}
        />
        <span className="done-label">Selesai</span>
      </label>
    </div>
    <div className="card-total">
      Rp {row.total.toLocaleString('id-ID')}
    </div>
  </div>

  {/* ITEMS */}
<div className="card-items">
  {(row.items || []).length === 0 ? (
    <div style={{ fontSize: '0.8rem', color: '#999' }}>
      Tidak ada detail menu
    </div>
  ) : (
    <>
<div className="item-grid">
  {itemsToShow.map((item, i) => (
    <div className="item-entry" key={i}>

  <div className="item-thumb-group">
        <div className="item-thumb">
          {item.icon ? (
            (item.icon.startsWith('http') || item.icon.startsWith('/') || item.icon.startsWith('data:')) ? (
              <img
                src={item.icon.startsWith('/') ? `${API}${item.icon}` : item.icon}
                alt={item.nama}
                className="item-thumb-img"
              />
            ) : (
              <div className="item-thumb-fallback">{item.icon}</div>
            )
          ) : (
            <div className="item-thumb-fallback">🍽️</div>
          )}
        </div>

{item.icon2 && (
  <div className="item-thumb small">
    {(
      item.icon2.startsWith('http') ||
      item.icon2.startsWith('/') ||
      item.icon2.startsWith('data:')
    ) ? (
      <img
        src={
          item.icon2.startsWith('/')
            ? `${API}${item.icon2}`
            : item.icon2
        }
        alt={item.nama + ' alt2'}
        className="item-thumb-img"
      />
    ) : (
      <div className="item-thumb-fallback">{item.icon2}</div>
    )}
  </div>
)}
      </div>

      <div className="item-name">
        <div className="name-line">
          <span className="name-text">{item.nama}</span>
          <span className="qty-text">x{item.qty}</span>
        </div>

        {(item.varian || item.level) && (
          <div className="sub-text">
            {item.varian && <span>{item.varian}</span>}
            {item.level && <span> • {item.level}</span>}
          </div>
        )}
      </div>

    </div>
  ))}
</div>

      {(row.items || []).length > 4 && (
        <div
          className="lihat-semua"
          onClick={() => setOpenIndex(isOpen ? null : idx)}
        >
          {isOpen ? "Tutup" : `+ Lihat semua ${row.items.length} item`}
        </div>
      )}
    </>
  )}
</div>

  {/* FOOTER */}
  <div className="card-bottom">
    <div className="left card-middle">
  {new Date(row.tanggal).toLocaleTimeString('id-ID', {
  hour: '2-digit',
  minute: '2-digit'
})}
    </div>

    <div className="right">
      <span className={`metode ${row.metode}`}>
        {row.metode.toUpperCase()}
      </span>

      {row.bukti_qris && (
        <img
          src={`${API}${row.bukti_qris}`}
          className="qris-thumb"
          onClick={() =>
            setPreviewQris(`${API}${row.bukti_qris}`)
          }
        />
      )}
    </div>
  </div>
</div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* MODAL PREVIEW QRIS */}
      {previewQris && (
        <div className="qris-modal-overlay" onClick={() => setPreviewQris(null)}>
          <div className="qris-modal" onClick={e => e.stopPropagation()}>
            <img src={previewQris} alt="Preview QRIS" />
            <button onClick={() => setPreviewQris(null)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transaksi;
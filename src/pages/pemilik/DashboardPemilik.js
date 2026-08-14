import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/DashboardPemilik.css";
import NavbarPemilik from "../../components/NavbarPemilik";

function DashboardPemilik() {
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    pemasukan: 0,
    pengeluaran: 0,
    laba: 0,
    transaksi: []
  });
  const [menuSales, setMenuSales] = useState([]);
  const [menuOptions, setMenuOptions] = useState(['Semua']);
  const [menuFilter, setMenuFilter] = useState('Semua');
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();

    // Auto refresh setiap 30 detik
    const dashboardInterval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(dashboardInterval);
  }, []);

  useEffect(() => {
    fetchMenuSales(menuFilter);

    const menuInterval = setInterval(() => fetchMenuSales(menuFilter), 30000);
    return () => clearInterval(menuInterval);
  }, [menuFilter]);

  // Bagian ini mengambil data dashboard owner dari backend.
  // Data yang diterima nanti dipakai untuk menampilkan total pemasukan, pengeluaran, laba, dan daftar transaksi.
  // Fungsi ini mengambil data dari backend saat halaman dashboard dibuka.
  // Jika request berhasil, data akan disimpan ke state dan ditampilkan ke layar.
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/owner/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      // Jika response dari backend tidak berhasil, error akan dilempar dan ditangani di bagian catch.
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      // Error ini ditampilkan ke user lewat state error agar halaman tidak blank saat ada masalah.
      setError(err.message);
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuSales = async (filter = menuFilter) => {
    try {
      setMenuLoading(true);
      setMenuError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/owner/grafik-penjualan-menu-hari-ini?filter=${encodeURIComponent(filter)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch menu sales data');
      }

      const data = await response.json();
      setMenuSales(data.data || []);
      if (Array.isArray(data.options) && data.options.length > 0) {
        const normalizedOptions = data.options;
        setMenuOptions(normalizedOptions);

        if (!normalizedOptions.includes(filter) && filter !== 'Semua') {
          setMenuFilter('Semua');
        }
      } else {
        setMenuOptions(['Semua']);
      }
    } catch (err) {
      setMenuError(err.message);
      console.error('Error fetching menu sales data:', err);
    } finally {
      setMenuLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (t) => {
    if (!t) return '-';
    return t.length >= 5 ? t.substring(0,5) : t;
  };

  const getBadgeClass = (ditambahkanOleh) => {
    switch (ditambahkanOleh?.toLowerCase()) {
      case 'kasir':
        return 'kasir';
      case 'owner':
        return 'owner';
      default:
        return '';
    }
  };

  const pemasukanCount = dashboardData.transaksi.filter(t => t.jenis === 'pemasukan').length;
  const pengeluaranCount = dashboardData.transaksi.filter(t => t.jenis === 'pengeluaran').length;
  const labaValue = Number(dashboardData.laba) || 0;
  const labaLabel = labaValue >= 0 ? 'Untung' : 'Rugi';
  const sortedMenuSales = [...menuSales].sort((a, b) => Number(b.quantity) - Number(a.quantity));
  const topMenuSales = sortedMenuSales.slice(0, 5);
  const maxMenuQuantity = topMenuSales.reduce((max, item) => Math.max(max, Number(item.quantity) || 0), 0);

  if (loading) {
    return (
      <div className="laporan-owner-bg">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Loading dashboard data...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="laporan-owner-bg">
        <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
          <h2>Error: {error}</h2>
          <button onClick={fetchDashboardData} style={{ padding: '10px 20px', marginTop: '20px' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo-section">
          <img src="/logimichi.jpg" alt="Logo Michi" className="logo-img" />
          <span className="logo-title">PEMILIK MICHI</span>
        </div>
        <NavbarPemilik />
      </header>
      <main className="laporan-main">
        <h1 className="laporan-main-title">DASHBOARD PEMILIK</h1>
        <section className="laporan-table-section">
          <div className="owner-wrapper">
            <div className="owner-summary-stats">
              <div className="stat-box stat-pemasukan">
                <span className="dashboardpemilik-stat-icon">💰</span>
                <div className="stat-content">
                  <span className="dashboardpemilik-stat-label">Total Pemasukan</span>
                  <div className="stat-row">
                    <span className="stat-value">{formatCurrency(dashboardData.pemasukan)}</span>
                    <span className="stat-transaksi">{pemasukanCount} Transaksi</span>
                  </div>
                </div>
              </div>

              <div className="stat-box stat-pengeluaran">
                <span className="dashboardpemilik-stat-icon">💸</span>
                <div className="stat-content">
                  <span className="dashboardpemilik-stat-label">Total Pengeluaran</span>
                  <div className="stat-row">
                    <span className="stat-value">{formatCurrency(dashboardData.pengeluaran)}</span>
                    <span className="stat-transaksi">{pengeluaranCount} Transaksi</span>
                  </div>
                </div>
              </div>

              <div className={`stat-box stat-laba ${labaValue >= 0 ? 'positive' : 'negative'}`}>
                <span className="dashboardpemilik-stat-icon">📊</span>
                <div className="stat-content">
                  <span className="dashboardpemilik-stat-label">Laba Rugi</span>
                  <div className="stat-row">
                    <span className="stat-value">{formatCurrency(dashboardData.laba)}</span>
                    <span className="stat-transaksi">{labaLabel}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-scroll-content">
              <div className="menu-sales-section">
                <div className="laporan-table-title">STATISTIK MENU TERLARIS HARI INI</div>
                <div className="menu-sales-card">
                  <div className="menu-sales-card-header">
                    <div className="sales-filter-field sales-filter-inline">
                      <label htmlFor="menu-filter">Filter</label>
                      <select
                        id="menu-filter"
                        className="sales-filter-select"
                        value={menuFilter}
                        onChange={(e) => setMenuFilter(e.target.value)}
                      >
                        {menuOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="sales-chart-body">
                    {menuLoading ? (
                      <div className="sales-no-data">Loading statistik penjualan...</div>
                    ) : menuError ? (
                      <div className="sales-no-data" style={{ color: 'red' }}>Error: {menuError}</div>
                    ) : topMenuSales.length === 0 ? (
                      <div className="sales-no-data">Belum ada data penjualan.</div>
                    ) : (
                      <div className="menu-sales-card-list">
                        {topMenuSales.map((item, idx) => {
                          const quantity = Number(item.quantity) || 0;
                          const widthPercent = maxMenuQuantity ? Math.round((quantity / maxMenuQuantity) * 100) : 0;
                          const menuIcon = item.icon || item.emoji || '🍽️';

                          return (
                            <div className="menu-sales-item" key={`${item.menu || 'menu'}-${idx}`}>
                              <div className="menu-sales-item-heading">
                                <div className="menu-sales-item-title">
                                  <span className="menu-sales-item-icon">
                                    {typeof menuIcon === 'string' && (menuIcon.startsWith('http') || menuIcon.startsWith('/') || menuIcon.startsWith('data:')) ? (
                                      <img src={menuIcon.startsWith('/') ? `${API}${menuIcon}` : menuIcon} alt={item.menu || 'Menu'} />
                                    ) : (
                                      menuIcon || '🍽️'
                                    )}
                                  </span>
                                  <span className="menu-sales-item-label">{item.menu || 'Menu'}</span>
                                </div>
                                <div className="menu-sales-item-value">{new Intl.NumberFormat('id-ID').format(quantity)}</div>
                              </div>
                              <div className="menu-sales-item-bar-wrap">
                                <div className="menu-sales-item-bar" style={{ width: `${widthPercent}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="laporan-table-title">Transaksi Hari Ini</div>
              <div className="owner-laporan-table-box">
                <div className="laporan-table-wrapper">
                  <table className="laporan-table">
                    <thead>
                      <tr>
                        <th>Jam</th>
                        <th>Jenis</th>
                        <th>Kategori</th>
                        <th>Keterangan</th>
                        <th>Jumlah</th>
                        <th>Ditambahkan oleh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.transaksi.length > 0 ? (
                        dashboardData.transaksi.map((item, index) => (
                          <tr key={index}>
                            <td>{formatTime(item.waktu)}</td>
                            <td>{item.jenis}</td>
                            <td>{item.jenis === 'pengeluaran' ? (item.kategori_pengeluaran || '-') : '-'}</td>
                            <td>
                              {item.jenis === "pemasukan"
                                ? ((item.sumber && item.sumber !== 'owner' && item.sumber !== 'manual')
                                    ? item.sumber
                                    : (item.keterangan || '-'))
                                : (item.keterangan || '-')}
                            </td>
                            <td>{formatCurrency(item.jumlah)}</td>
                            <td>
                              <span className={`laporan-badge ${item.ditambahkan_oleh === 'owner' ? 'owner' : item.ditambahkan_oleh}`}>
                                {item.ditambahkan_oleh === 'owner' ? 'pemilik' : item.ditambahkan_oleh}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                            Belum Ada Transaksi Hari Ini
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardPemilik;

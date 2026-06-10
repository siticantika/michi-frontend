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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto refresh setiap 30 detik
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

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
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
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
            <div className="laporan-table-title">Transaksi Hari Ini</div>
        <div className="owner-laporan-table-box">
  <div className="laporan-table-wrapper">
    <table className="laporan-table">
      <thead>
        <tr>
          <th>Jam</th>
          <th>Jenis</th>
          <th>Sumber/Keterangan</th>
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
      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
        Belum Ada Transaksi Hari Ini
      </td>
    </tr>
  )}
</tbody>
    </table>
  </div>
</div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardPemilik;

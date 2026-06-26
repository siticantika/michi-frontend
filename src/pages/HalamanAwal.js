import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HalamanAwal.css';

function HalamanAwal() {
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const [role, setRole] = useState('pemilik');

  // Fungsi ini mengarahkan pengguna ke halaman login sesuai role yang dipilih.
  const handleMasuk = () => {
    if (role === 'pemilik') navigate('/pemilik/login');
    else if (role === 'kasir') navigate('/kasir/loginkasir');
    else if (role === 'admin') navigate('/admin/login');
  };

  return (
    <div className="halamanawal-container">
      <img src="/login-bg.jpg" alt="" className="halamanawal-bg" />
      <div className="halamanawal-bg-overlay" />
      <div className="halamanawal-card">
        <div className="halamanawal-card-left">
          <img src="/logimichi.jpg" alt="Logo Michi" className="halamanawal-logo" />
          <h1 className="halamanawal-brand">MICHI</h1>
          <p className="halamanawal-brand-sub">(Mini Chicken)</p>
          <p className="halamanawal-quote">"Kelola Bisnis Dengan Lebih Mudah Dan Terorganisir."</p>
          <div className="halamanawal-features">
            <div className="halamanawal-feature-item">
              <span>🧾</span><span>Transaksi</span>
            </div>
            <div className="halamanawal-feature-item">
              <span>📊</span><span>Laporan</span>
            </div>
            <div className="halamanawal-feature-item">
              <span>💰</span><span>Keuangan</span>
            </div>
          </div>
        </div>
        <div className="halamanawal-card-right">
          <h2 className="halamanawal-form-title">Masuk ke Sistem</h2>
          <p className="halamanawal-form-subtitle">Pilih role Anda untuk melanjutkan</p>
          <div className="halamanawal-role-label">Masuk sebagai</div>
          <div className="halamanawal-role-group">
            <button className={`halamanawal-role-btn ${role === 'pemilik' ? 'active' : ''}`} onClick={() => setRole('pemilik')}>Pemilik</button>
            <button className={`halamanawal-role-btn ${role === 'kasir' ? 'active' : ''}`} onClick={() => setRole('kasir')}>Kasir</button>
            <button className={`halamanawal-role-btn ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>Admin</button>
          </div>
          <button className="halamanawal-masuk-btn" onClick={handleMasuk}>Masuk →</button>
          <p className="halamanawal-note">🔒 Akses terbatas untuk staff Michi</p>
        </div>
      </div>
    </div>
  );
}

export default HalamanAwal;

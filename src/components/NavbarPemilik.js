import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function NavbarPemilik({ open, setOpen }) {
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const location = useLocation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof setOpen === 'function';
  const drawerOpen = isControlled ? open : internalOpen;
  const toggle = isControlled ? setOpen : setInternalOpen;

  // Fungsi logout digunakan untuk mengakhiri sesi owner dan menghapus token dari browser.
  const handleLogout = async () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      await fetch(`${process.env.REACT_APP_API_URL}/api/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: token })
      });
    }
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
};

  const navs = [
    { label: 'Dashboard', path: '/pemilik/dashboard' },
    { label: 'Pengeluaran', path: '/pemilik/pengeluaran' },
    { label: 'Laporan Bulanan', path: '/pemilik/laporan' },
  ];

  useEffect(() => {
   const sendBeacon = () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  const blob = new Blob(
    [JSON.stringify({ token })],
    { type: 'application/json' }
  );

  navigator.sendBeacon(
    `${process.env.REACT_APP_API_URL}/api/logout-beacon`,
    blob
  );
};

    const handleBeforeUnload = () => sendBeacon();

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <>
      {!isControlled && (
        <button
          className="nav-toggle"
          aria-label="Toggle navigation"
          onClick={() => toggle(o => !o)}
          type="button"
        >
          ☰
        </button>
      )}
      <nav className={"dashboard-nav" + (drawerOpen ? ' open' : '')}>
        <div className="nav-items">
        {navs.map(nav => {
          const isActive = location.pathname === nav.path || location.pathname === nav.path + '/';
          return (
            <button
              key={nav.path}
              className={"pemilik-nav-link" + (isActive ? ' active' : '')}
              onClick={() => { navigate(nav.path); toggle(false); }}
              type="button"
            >
              {nav.label}
            </button>
          );
        })}
        </div>
        <button className="dashboard-nav-link logout" onClick={() => { handleLogout(); toggle(false); }} type="button">
          <span className="logout-text">LogOut</span>
          <span className="logout-icon">➡️</span>
        </button>
      </nav>
      {!isControlled && drawerOpen && (
        <div className="nav-backdrop" onClick={() => toggle(false)} />
      )}
    </>
  );
}

export default NavbarPemilik;

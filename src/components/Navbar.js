import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Navbar({ open, setOpen }) {
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const location = useLocation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof setOpen === 'function';
  const drawerOpen = isControlled ? open : internalOpen;
  const toggle = isControlled ? setOpen : setInternalOpen;

  const handleLogout = async () => {
  const token = localStorage.getItem('token');
  try {
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
    console.error('Logout error:', err.message);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
};

  const navs = [
    { label: 'Dashboard', path: '/kasir/dashboard' },
    { label: 'Riwayat Pesanan', path: '/kasir/transaksi' },
    { label: 'Pengeluaran', path: '/kasir/pengeluaran' },
    { label: 'Menu', path: '/kasir/tambahmenu' },
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
)};

    const handleBeforeUnload = () => sendBeacon();

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <>
      {/* render internal toggle button if parent didn't provide control */}
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
        {navs.map(nav => {
          const isActive = location.pathname === nav.path || location.pathname === nav.path + '/';
          return (
            <button
              key={nav.path}
              className={"dashboard-nav-link" + (isActive ? ' active' : '')}
              onClick={() => { navigate(nav.path); toggle(false); }}
              type="button"
            >
              {nav.label}
            </button>
          );
        })}
        <button className="dashboard-nav-link logout" onClick={() => { handleLogout(); toggle(false); }} type="button">LogOut <span className="logout-icon">➡️</span></button>
      </nav>
      {/* backdrop for internal drawer */}
      {!isControlled && drawerOpen && (
        <div className="nav-backdrop" onClick={() => toggle(false)} />
      )}
    </>
  );
}

export default Navbar;

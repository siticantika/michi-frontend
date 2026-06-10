import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/LoginPemilik.css';

function LoginAdmin(){
  const API = process.env.REACT_APP_API_URL;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    setError('');
    try{
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('adminToken', data.token);
        navigate('/admin/dashboard');
      } else {
        setError(data.message || 'Login gagal');
      }
    } catch(err){
      setError('Terjadi kesalahan koneksi');
    }
  };

  return (
    <div className="login-container">
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-menu-wrapper">
            <div className="popup-avatar" aria-hidden>
              <svg viewBox="0 0 24 24" width="96" height="96" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                <circle cx="12" cy="8" r="3" fill="#ffffff" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#ffffff" />
              </svg>
            </div>
            <div className="popup-menu-header-admin">
              <span>ADMIN LOGIN</span>
            </div>
            <div className="popup-menu-body">
              <form className="popup-form" onSubmit={handleSubmit}>
                <label>Username</label>
                <input
                  type="text"
                  className="popup-input"
                  placeholder="Masukkan Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <label>Password</label>
                <input
                  type="password"
                  className="popup-input"
                  placeholder="Masukkan Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {error && <div style={{color: 'red', marginBottom: 8}}>{error}</div>}
              </form>
            </div>
            <div className="popup-menu-footer">
              <button type="button" className="popup-save-btn" onClick={handleSubmit}>
                <span style={{marginRight: '8px'}}>🔒</span>
                <span style={{fontWeight:700}}>LOGIN</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <button className="login-back-btn" onClick={() => navigate('/')}>←</button>
    </div>
  );
}

export default LoginAdmin;

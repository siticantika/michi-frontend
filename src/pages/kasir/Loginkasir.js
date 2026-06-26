import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/LoginPemilik.css";


function Loginkasir() {
  const API = process.env.REACT_APP_API_URL;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Bagian ini menangani proses login kasir saat form dikirim.
  // Jika data benar, sistem menyimpan token dan mengarahkan ke dashboard kasir.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Frontend mengirim username dan password ke backend untuk divalidasi.
      // Setelah login berhasil, frontend menyimpan token di localStorage agar sesi tetap tersimpan.
      // Token ini akan dipakai di request berikutnya untuk mengakses halaman yang dibatasi.
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password, role: 'kasir' }),
      });
      let data = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        setError("Response tidak valid dari server");
        setLoading(false);
        console.error(jsonErr);
        return;
      }
      if (data && data.message === "Login berhasil" && data.user && data.user.role === 'kasir') {
        // Token dan data user disimpan di browser agar halaman berikutnya bisa mengenali sesi login.
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setError("");
        setLoading(false);
        navigate("/kasir/dashboard");
      } else if (data && data.message === "Login berhasil" && data.user && data.user.role !== 'kasir') {
        setError("Akun ini bukan kasir!");
        setLoading(false);
      } else {
        setError((data && data.message) || "Username atau password salah!");
        setLoading(false);
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi");
      setLoading(false);
      console.error(err);
    }
  };

  return (
    <div className="login-container">
      {/** Reuse owner popup markup for consistent appearance */}
      <div className="popup-overlay">
        <div className="popup-menu-wrapper">
          <div className="popup-avatar" aria-hidden>
            <svg viewBox="0 0 24 24" width="96" height="96" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
              <circle cx="12" cy="8" r="3" fill="#ffffff" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#ffffff" />
            </svg>
          </div>
          <div className="popup-menu-header-kasir">
            <span>KASIR LOGIN</span>
          </div>
          <div className="popup-menu-body">
            {/* Form ini menerima username dan password kasir sebelum login diproses. */}
            <form className="popup-form" onSubmit={handleSubmit}>
              <label>Username</label>
              <input
                type="text"
                className="popup-input"
                placeholder="Masukkan Username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            <button type="button" className="popup-save-btn" onClick={handleSubmit} disabled={loading}>
              <span style={{marginRight: '8px'}}>🔒</span>
              <span style={{fontWeight:700}}>{loading ? 'Loading...' : 'LOGIN'}</span>
            </button>
          </div>
        </div>
      </div>
      <button className="login-back-btn" onClick={() => navigate('/')}>←</button>
    </div>
  );
}

export default Loginkasir;

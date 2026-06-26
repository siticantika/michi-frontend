import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/PengeluaranPemilik.css";
import "../../styles/DashboardPemilik.css";
import NavbarPemilik from "../../components/NavbarPemilik";

function PengeluaranPemilik() {
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [form, setForm] = useState({ tanggal: "", waktu: "", keterangan: "", jumlah: "" });
  const [editingItem, setEditingItem] = useState(null);

  // Saat halaman dibuka, data pengeluaran akan langsung diambil dari backend.
  // Tujuannya agar owner bisa melihat catatan pengeluaran hari ini tanpa refresh manual.
  useEffect(() => {
    fetchPengeluaran();
  }, []);

  // Fungsi ini mengambil data pengeluaran dari API lalu menyimpannya ke state.
  // Data ini nanti dipakai untuk menampilkan tabel dan menghitung total pengeluaran.
  const fetchPengeluaran = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/keuangan/pengeluaran`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPengeluaranList(data || []);
      }
    } catch (err) {
      console.error("Error fetching pengeluaran:", err);
    }
  };

  // Saat tombol tambah diklik, form popup dibuka dan state form dikosongkan.
  // Ini memudahkan owner untuk memasukkan pengeluaran baru.
  const handleOpenPopup = () => {
    setEditingItem(null);
    setForm({ tanggal: "", waktu: "", keterangan: "", jumlah: "" });
    setShowPopup(true);
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setForm({ tanggal: item.tanggal || "", waktu: item.waktu || "", keterangan: item.keterangan || "", jumlah: item.jumlah || "" });
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setEditingItem(null);
    setShowPopup(false);
    setForm({ tanggal: "", waktu: "", keterangan: "", jumlah: "" });
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Fungsi ini menangani proses simpan atau edit pengeluaran.
  // Jika sedang mengedit, request dikirim ke endpoint PUT; jika menambah baru, ke POST.
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const body = { keterangan: form.keterangan, jumlah: form.jumlah };

      let res;
      if (editingItem && editingItem.id) {
        res = await fetch(`${API}/api/keuangan/pengeluaran/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body)
        });
      } else {
        res = await fetch(`${API}/api/keuangan/pengeluaran`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body)
        });
      }

      if (res.ok) {
        handleClosePopup();
        fetchPengeluaran();
      } else {
        console.error("Server returned", res.status);
      }
    } catch (err) {
      console.error("Error saving pengeluaran:", err);
    }
  };

  // Bagian ini menghitung total pengeluaran dan jumlah data yang ditampilkan.
  // Nilai ini penting untuk memberi gambaran ringkas kepada owner saat melihat dashboard pengeluaran.
  const totalPengeluaran = pengeluaranList.reduce((s, it) => s + parseInt(it.jumlah || 0, 10), 0);
  const pengeluaranCount = pengeluaranList.length;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const formatTime = (t) => {
    if (!t) return "-";
    return t.length >= 5 ? t.substring(0, 5) : t;
  };

  return (
    <div className="pengeluaran-owner-bg">
      <header className="dashboard-header">
        <div className="logo-section">
          <img src="/logimichi.jpg" alt="Logo Michi" className="logo-img" />
          <span className="logo-title">OWNER MICHI</span>
        </div>
        <NavbarPemilik />
      </header>

      <main className="pengeluaran-main">
        <h1 className="pengeluaran-main-title">PENGELUARAN</h1>

        <div className="owner-wrapper" style={{ position: "relative" }}>
          <div className="owner-summary-stats">
            <div className="stat-box">
              <span className="dashboardpemilik-stat-icon">💸</span>
              <div className="stat-content">
                <span className="dashboardpemilik-stat-label">Total Pengeluaran</span>
                <div className="stat-row">
                  <span className="stat-value orange">{formatCurrency(totalPengeluaran)}</span>
                </div>
              </div>
            </div>

            <div className="stat-box">
              <span className="dashboardpemilik-stat-icon">🧾</span>
              <div className="stat-content">
                <span className="dashboardpemilik-stat-label">Jumlah Transaksi</span>
                <div className="stat-row">
                  <span className="stat-value">{pengeluaranCount}</span>
                </div>
              </div>
            </div>

            <div className="stat-add-box">
              <button className="pengeluaran-add-btn" onClick={handleOpenPopup}>+ Tambah Pengeluaran</button>
            </div>
          </div>

          <div className="laporan-table-title">Pengeluaran Hari Ini</div>

          <div className="owner-laporan-table-box">
            <div className="laporan-table-wrapper">
              <table className="laporan-table">
                <thead>
                  <tr>
                    <th>Jam</th>
                    <th>Keterangan</th>
                    <th>Jumlah</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pengeluaranList.length > 0 ? (
                    pengeluaranList.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td>{formatTime(item.waktu)}</td>
                        <td>{item.keterangan}</td>
                        <td>{formatCurrency(parseInt(item.jumlah || 0, 10))}</td>
                        <td>
                          <button className="pengeluaran-edit-btn" onClick={() => handleEditClick(item)}>Edit</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Belum Ada Pengeluaran Hari Ini</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showPopup && (
          <div className="pemasukan-popup-bg">
            <div className="pemasukan-popup">
              <div className="pemasukan-popup-header">
                <span className="pemasukan-popup-title">{editingItem ? "Edit Pengeluaran" : "Tambahkan Pengeluaran Baru"}</span>
                <button className="pemasukan-popup-close" onClick={handleClosePopup}>✕</button>
              </div>

              <form className="pemasukan-popup-form" onSubmit={handleSubmit}>
                <div className="pemasukan-popup-field">
                  <label>Keterangan Pengeluaran</label>
                  <input type="text" name="keterangan" value={form.keterangan} onChange={handleChange} required className="pemasukan-popup-input" />
                </div>

                <div className="pemasukan-popup-field">
                  <label>Jumlah Pengeluaran</label>
                  <input type="number" name="jumlah" value={form.jumlah} onChange={handleChange} required className="pemasukan-popup-input" />
                </div>

                <button type="submit" className="pemasukan-popup-btn">💾 {editingItem ? "Simpan Perubahan" : "Simpan Pengeluaran"}</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PengeluaranPemilik;

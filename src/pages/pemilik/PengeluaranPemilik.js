import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/PengeluaranPemilik.css";
import "../../styles/DashboardPemilik.css";
import NavbarPemilik from "../../components/NavbarPemilik";

function PengeluaranPemilik() {
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const defaultCategoryOptions = ["Tagihan Bulanan", "Gaji Pegawai", "Bahan Makanan", "Non Makanan", "Lainnya", "Modal", "Investasi"];
  const [showPopup, setShowPopup] = useState(false);
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [form, setForm] = useState({ tanggal: "", waktu: "", keterangan: "", kategori_pengeluaran: "", kategori_baru: "", jumlah: "" });
  const [editingItem, setEditingItem] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState(defaultCategoryOptions);
  const [errorMsg, setErrorMsg] = useState('');

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
        const normalized = Array.isArray(data) ? data : [];
        setPengeluaranList(normalized);

        const categories = Array.from(
          new Set([
            ...defaultCategoryOptions,
            ...normalized
              .map((item) => item.kategori_pengeluaran)
              .filter(Boolean)
          ])
        );
        setCategoryOptions(categories);
      }
    } catch (err) {
      console.error("Error fetching pengeluaran:", err);
    }
  };

  // Saat tombol tambah diklik, form popup dibuka dan state form dikosongkan.
  // Ini memudahkan owner untuk memasukkan pengeluaran baru.
  const handleOpenPopup = () => {
    setEditingItem(null);
    // default waktu to client's current time (HH:MM:SS)
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const defaultWaktu = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setForm({ tanggal: "", waktu: defaultWaktu, keterangan: "", kategori_pengeluaran: "", kategori_baru: "", jumlah: "" });
    setShowPopup(true);
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setForm({
      tanggal: item.tanggal || "",
      waktu: item.waktu || "",
      keterangan: item.keterangan || "",
      kategori_pengeluaran: defaultCategoryOptions.includes(item.kategori_pengeluaran) ? item.kategori_pengeluaran : "",
      kategori_baru: defaultCategoryOptions.includes(item.kategori_pengeluaran) ? "" : item.kategori_pengeluaran || "",
      jumlah: item.jumlah || ""
    });
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setEditingItem(null);
    setShowPopup(false);
    setForm({ tanggal: "", waktu: "", keterangan: "", kategori_pengeluaran: "", kategori_baru: "", jumlah: "" });
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  // clear error message when user types
  const handleChangeWithClear = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg('');
  };

  const getFinalCategory = () => {
    const customCategory = form.kategori_baru?.trim();
    return customCategory || form.kategori_pengeluaran || "";
  };

  // Fungsi ini menangani proses simpan atau edit pengeluaran.
  // Jika sedang mengedit, request dikirim ke endpoint PUT; jika menambah baru, ke POST.
  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalCategory = getFinalCategory();
    // validate: keterangan, jumlah > 0, and category (existing or new) must be provided
    const keteranganValid = (form.keterangan || '').toString().trim() !== '';
    const jumlahValid = form.jumlah !== '' && !isNaN(Number(form.jumlah)) && Number(form.jumlah) > 0;
    const kategoriValid = finalCategory && finalCategory.trim() !== '';

    if (!keteranganValid || !jumlahValid || !kategoriValid) {
      setErrorMsg('Lengkapi data pengeluaran');
      return;
    }
    setErrorMsg('');

    try {
      const token = localStorage.getItem("token");
      const body = {
        keterangan: form.keterangan,
        jumlah: form.jumlah,
        kategori_pengeluaran: finalCategory,
        waktu: form.waktu
      };

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
    const parts = t.split(":");
    let hh = parseInt(parts[0], 10);
    const mm = parts[1] ? parts[1].padStart(2, '0') : '00';
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12;
    if (hh === 0) hh = 12;
    return `${String(hh).padStart(2, '0')}:${mm} ${ampm}`;
  };

  // Prefer displaying the combined tanggal+waktu interpreted as UTC and converted
  // to the client's local timezone. This corrects rows stored in UTC so they show
  // the user's local time. We keep this logic isolated to UI formatting only.
  const formatDisplayTime = (tanggalIso, waktuStr) => {
    if (!tanggalIso || !waktuStr) return '-';
    try {
      // tanggalIso is like '2026-08-31T00:00:00.000Z'
      const base = new Date(tanggalIso); // midnight UTC
      const parts = waktuStr.split(':');
      const hh = Number(parts[0] || 0);
      const mm = Number(parts[1] || 0);
      const ss = Number(parts[2] || 0);
      // create a Date object representing the UTC datetime
      const dtUtc = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hh, mm, ss));
      // format to client's locale in 12-hour format
      return dtUtc.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return formatTime(waktuStr);
    }
  };

  return (
    <div className="pengeluaran-owner-bg">
      <header className="dashboard-header">
        <div className="logo-section">
          <img src="/logimichi.jpg" alt="Logo Michi" className="logo-img" />
          <span className="logo-title">PEMILIK MICHI</span>
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
                    <th>Kategori</th>
                    <th>Keterangan</th>
                    <th>Jumlah</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pengeluaranList.length > 0 ? (
                    pengeluaranList.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td>{formatDisplayTime(item.tanggal, item.waktu)}</td>
                        <td>{item.kategori_pengeluaran || '-'}</td>
                        <td>{item.keterangan}</td>
                        <td>{formatCurrency(parseInt(item.jumlah || 0, 10))}</td>
                        <td>
                          <button className="pengeluaran-edit-btn" onClick={() => handleEditClick(item)}>Edit</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Belum Ada Pengeluaran Hari Ini</td>
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
                  <input type="text" name="keterangan" value={form.keterangan} onChange={handleChangeWithClear} required className="pemasukan-popup-input" />
                </div>

                <div className="pemasukan-popup-field">
                  <label>Kategori yang sudah ada</label>
                  <select
                    name="kategori_pengeluaran"
                    value={form.kategori_pengeluaran}
                    onChange={handleChangeWithClear}
                    className="pemasukan-popup-input pemasukan-popup-select"
                  >
                    <option value="">Pilih kategori</option>
                    {categoryOptions.map((category) => (
                      <option value={category} key={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="pemasukan-popup-field">
                  <label>Kategori baru (opsional)</label>
                  <input
                    type="text"
                    name="kategori_baru"
                    value={form.kategori_baru}
                    onChange={handleChangeWithClear}
                    className="pemasukan-popup-input"
                    placeholder="Masukkan kategori baru"
                  />
                </div>

                {/* Waktu diisi otomatis oleh sistem; input dihapus */}

                <div className="pemasukan-popup-field">
                  <label>Jumlah Pengeluaran</label>
                  <input
                    type="number"
                    name="jumlah"
                    value={form.jumlah}
                    onChange={handleChangeWithClear}
                    required
                    className="pemasukan-popup-input"
                    placeholder="Masukkan jumlah pengeluaran"
                    min="0"
                  />
                </div>
                {errorMsg && (
                  <div style={{ color: '#b00020', fontWeight: 700, marginTop: 6 }}>{errorMsg}</div>
                )}

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

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/PengeluaranPemilik.css";
import NavbarPemilik from "../../components/NavbarPemilik";

function PemasukanPemilik() {
	const API = process.env.REACT_APP_API_URL;
	const navigate = useNavigate();
	const HIDE_OWNER_PEMASUKAN = true;
	const [showPopup, setShowPopup] = useState(false);
	const [pemasukanList, setPemasukanList] = useState([]);
	const [form, setForm] = useState({
		tanggal: "",
		waktu: "",
		keterangan: "",
		jumlah: ""
	});

	// Tampilan halaman pemasukan owner disembunyikan karena sistem sudah memakai transaksi kasir sebagai sumber pemasukan.
	// Kode tetap disimpan agar bisa diaktifkan kembali nanti tanpa perlu menulis ulang.
	useEffect(() => {
		if (HIDE_OWNER_PEMASUKAN) {
			navigate('/pemilik/dashboard', { replace: true });
			return;
		}
		fetchPemasukan();
	}, [navigate, HIDE_OWNER_PEMASUKAN]);

	// Fungsi ini mengambil data pemasukan dari API dan menyimpannya ke state agar tampil di halaman.
	// Data ini nantinya dipakai untuk menghitung total pemasukan dan menampilkan tabel.
	const fetchPemasukan = async () => {
		try {
			const token = localStorage.getItem('token');
			const response = await fetch(`${API}/api/keuangan/pemasukan`, {
				headers: {
  					Authorization: `Bearer ${localStorage.getItem("token")}`
						}
			});
			if (response.ok) {
				const data = await response.json();
				setPemasukanList(data);
			}
		} catch (error) {
			console.error('Error fetching pemasukan:', error);
		}
	};

	const handleOpenPopup = () => setShowPopup(true);
	const handleClosePopup = () => setShowPopup(false);

	const handleChange = e => {
		setForm({ ...form, [e.target.name]: e.target.value });
	};

	// Saat owner menambahkan pemasukan, data dikirim ke backend lalu daftar diperbarui.
	// Proses ini membuat catatan pemasukan baru masuk ke sistem dan muncul di halaman owner.
	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const token = localStorage.getItem('token');
			const response = await fetch(`${API}/api/keuangan/pemasukan`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({
					keterangan: form.keterangan,
					jumlah: form.jumlah
				})
			});
			if (response.ok) {
				setForm({ tanggal: "", waktu: "", keterangan: "", jumlah: "" });
				setShowPopup(false);
				fetchPemasukan(); // Refetch data
			}
		} catch (error) {
			console.error('Error adding pemasukan:', error);
		}
	};

	const totalPemasukan = pemasukanList.reduce((sum, item) => sum + parseInt(item.jumlah || "0"), 0);

	const pemasukanCount = pemasukanList.length;

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	};

	const formatTime = (t) => {
		if (!t) return '-';
		// expect format HH:MM:SS or HH:MM, return HH:MM
		return t.length >= 5 ? t.substring(0,5) : t;
	};

	if (HIDE_OWNER_PEMASUKAN) return null;

	return (
		<div className="pemasukan-owner-bg">
			<header className="dashboard-header">
				<div className="logo-section">
					<img src="/logimichi.jpg" alt="Logo Michi" className="logo-img" />
					<span className="logo-title">PEMILIK MICHI</span>
				</div>
				<NavbarPemilik />
			</header>

			<main className="pengeluaran-main">
				<h1 className="pengeluaran-main-title">PEMASUKAN</h1>

					<div className="owner-wrapper" style={{ position: 'relative' }}>
						<div className="owner-summary-stats">
							<div className="stat-box">
								<span className="dashboardpemilik-stat-icon">📈</span>
								<div className="stat-content">
									<span className="dashboardpemilik-stat-label">Total Pemasukan</span>
									<div className="stat-row">
										<span className="stat-value orange">{formatCurrency(totalPemasukan)}</span>
										</div>
									</div>
							</div>
			

							<div className="stat-box">
								<span className="dashboardpemilik-stat-icon">🧾</span>
								<div className="stat-content">
									<span className="dashboardpemilik-stat-label">Jumlah Transaksi</span>
									<div className="stat-row">
										<span className="stat-value">{pemasukanCount}</span>
									</div>
								</div>
							</div>

							<div className="stat-add-box">
								<button className="pengeluaran-add-btn" onClick={handleOpenPopup}>+ Tambah Pemasukan</button>
							</div>
						</div>

						<div className="laporan-table-title">Pemasukan Hari Ini</div>

						<div className="owner-laporan-table-box">
							<div className="laporan-table-wrapper">
								<table className="laporan-table">
									<thead>
										<tr>
											<th>Jam</th>
											<th>Keterangan</th>
											<th>Jumlah</th>
										</tr>
									</thead>
									<tbody>
											{pemasukanList.length > 0 ? (
												pemasukanList.map((item, idx) => (
													<tr key={item.id || idx}>
														<td>{formatDisplayTime(item.tanggal, item.waktu)}</td>
														<td>{item.keterangan}</td>
														<td>{formatCurrency(parseInt(item.jumlah || 0))}</td>
													</tr>
												))
											) : (
												<tr>
													<td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>
														Belum Ada Pemasukan Hari Ini
													</td>
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
								<span className="pemasukan-popup-title">Tambahkan Pemasukan Baru</span>
								<button className="pemasukan-popup-close" onClick={handleClosePopup}>×</button>
							</div>
							<form className="pemasukan-popup-form" onSubmit={handleSubmit}>
								<div className="pemasukan-popup-field">
									<label>Keterangan Pemasukan</label>
									<input type="text" name="keterangan" value={form.keterangan} onChange={handleChange} required className="pemasukan-popup-input" />
								</div>
								<div className="pemasukan-popup-field">
									<label>Jumlah Pemasukan</label>
									<input type="number" name="jumlah" value={form.jumlah} onChange={handleChange} required className="pemasukan-popup-input" />
								</div>
								<button type="submit" className="pemasukan-popup-btn">
									<span role="img" aria-label="save">💾</span> Simpan Pemasukan
								</button>
							</form>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}

export default PemasukanPemilik;

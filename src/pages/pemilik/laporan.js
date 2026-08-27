import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/laporan.css";
import "../../styles/DashboardPemilik.css";
import GrafikLaporan from "../../components/GrafikLaporan";
import {
	BarChart,
	Bar,
	LabelList,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	ResponsiveContainer,
	Legend
} from 'recharts';
import NavbarPemilik from "../../components/NavbarPemilik";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

function LaporanBulananPemilik() {
	const API = process.env.REACT_APP_API_URL;
	const navigate = useNavigate();
	const currentYear = new Date().getFullYear().toString();
	const [tahun, setTahun] = useState(currentYear);
	const [bulan, setBulan] = useState("01");
	const getLastDayOfMonth = (y, m) => new Date(Number(y), Number(m), 0).getDate();
	const defaultStart = `${currentYear}-${String(1).padStart(2,'0')}`; // placeholder, will set below
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [exportFormat, setExportFormat] = useState('pdf');
	const [laporanData, setLaporanData] = useState({
		totalPemasukan: 0,
		totalPengeluaran: 0,
		laba: 0,
		transaksi: []
	});
	// default kategori and order required by UI (always show these categories)
	const defaultKategori = [
		{ kategori: 'Tagihan Bulanan', total: 0 },
		{ kategori: 'Gaji Pegawai', total: 0 },
		{ kategori: 'Bahan Makanan', total: 0 },
		{ kategori: 'Non Makanan', total: 0 },
		{ kategori: 'Lainnya', total: 0 }
	];

	// initialize with default categories so chart always shows them
	const [pengeluaranKategori, setPengeluaranKategori] = useState(defaultKategori.map(d => ({ ...d })));
	const [menuSalesBulanan, setMenuSalesBulanan] = useState([]);
	const [menuOptionsBulanan, setMenuOptionsBulanan] = useState(['Semua']);
	const [menuFilterBulanan, setMenuFilterBulanan] = useState('Semua');
	const [menuLoadingBulanan, setMenuLoadingBulanan] = useState(true);
	const [menuErrorBulanan, setMenuErrorBulanan] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		// initialize default start/end to selected month
		const last = getLastDayOfMonth(tahun, bulan);
		setStartDate(`${tahun}-${String(bulan).padStart(2,'0')}-01`);
		setEndDate(`${tahun}-${String(bulan).padStart(2,'0')}-${String(last).padStart(2,'0')}`);
		fetchLaporan();
		fetchPengeluaranKategori();
		fetchMenuSalesBulanan(menuFilterBulanan);

		// NOTE: removed automatic polling to avoid flicker/refresh.
		// If manual refresh is desired, user can reload the page or we can add a button.

		return () => {};
	}, [tahun, bulan, menuFilterBulanan]);

	const fetchPengeluaranKategori = async () => {
		try {
			const token = localStorage.getItem('token');
			const response = await fetch(`${API}/api/owner/grafik-pengeluaran-kategori?bulan=${tahun}-${bulan}`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (!response.ok) throw new Error('Failed to fetch pengeluaran kategori');
			const res = await response.json();
			// merge API data with defaultKategori so all categories always show
			const apiData = (res.data || []).map(d => ({ kategori: d.kategori, total: Number(d.total || 0) }));
			const merged = defaultKategori.map(def => {
				const found = apiData.find(a => String(a.kategori).trim() === def.kategori);
				return { kategori: def.kategori, total: found ? found.total : 0 };
			});
			setPengeluaranKategori(merged);
		} catch (e) {
			console.error('fetchPengeluaranKategori error', e);
		}
	};

	// Bagian ini mengambil data laporan bulanan dari backend.
	// Data ini dipakai untuk menampilkan ringkasan keuangan dan daftar transaksi per bulan.
	// Fungsi ini mengambil data laporan dari backend untuk ditampilkan sesuai bulan yang dipilih.
	const fetchLaporan = async () => {
		try {
			setLoading(true);
			setError(null);
			const token = localStorage.getItem('token');
				let url = `${API}/api/owner/laporan-bulanan`;
				if (startDate && endDate) {
					url += `?start=${startDate}&end=${endDate}`;
				} else {
					url += `?bulan=${tahun}-${bulan}`;
				}
				const response = await fetch(url, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			if (!response.ok) {
				throw new Error('Failed to fetch laporan data');
			}
			const data = await response.json();
			setLaporanData(data);
		} catch (err) {
			// Jika request gagal, error disimpan ke state agar muncul pesan yang jelas ke user.
			setError(err.message);
			console.error('Error fetching laporan:', err);
		} finally {
			setLoading(false);
		}
	};

	const fetchMenuSalesBulanan = async (filter = menuFilterBulanan) => {
		try {
			setMenuLoadingBulanan(true);
			setMenuErrorBulanan(null);
			const token = localStorage.getItem('token');
			const response = await fetch(`${API}/api/owner/menu-sales-bulanan?bulan=${tahun}-${bulan}&filter=${encodeURIComponent(filter)}`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			if (!response.ok) {
				throw new Error('Failed to fetch monthly menu sales data');
			}
			const data = await response.json();
			setMenuSalesBulanan(data.data || []);
			if (Array.isArray(data.options) && data.options.length > 0) {
				const normalizedOptions = data.options;
				setMenuOptionsBulanan(normalizedOptions);
				if (!normalizedOptions.includes(filter) && filter !== 'Semua') {
					setMenuFilterBulanan('Semua');
				}
			} else {
				setMenuOptionsBulanan(['Semua']);
			}
		} catch (err) {
			setMenuErrorBulanan(err.message);
			console.error('Error fetching monthly menu sales data:', err);
		} finally {
			setMenuLoadingBulanan(false);
		}
	};

	const formatTime = (t) => {
		if (!t) return '-';
		// expect format HH:MM:SS or HH:MM, return HH:MM
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

	// Bagian ini menangani fitur ekspor laporan menjadi PDF dan Excel.
	// Data yang diekspor diambil dari state laporanData yang sebelumnya diambil dari backend.

	const logAktivitas = async (aksi) => {
		try {
			const token = localStorage.getItem('token');
			await fetch(`${API}/api/log-aktivitas`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': token ? `Bearer ${token}` : ''
				},
				body: JSON.stringify({ aksi })
			});
		} catch (e) {
			console.warn('logAktivitas failed', e);
		}
	};
	// Fungsi ini membuat file PDF berisi ringkasan laporan dan daftar transaksi.
	const exportPDF = () => {
		// Log that owner is exporting PDF
		logAktivitas('Export PDF Laporan Bulanan');
		try {
			const doc = new jsPDF();
			const pageWidth = doc.internal.pageSize.getWidth();
			const pageHeight = doc.internal.pageSize.getHeight();
			const monthName = bulanNames[parseInt(bulan, 10) - 1];
			const titleLabel = (startDate && endDate) ? `${startDate} - ${endDate}` : `${monthName} ${tahun}`;
			// Header centered
			doc.setFontSize(16);
			doc.text('LAPORAN KEUANGAN BULANAN', pageWidth / 2, 18, { align: 'center' });
			doc.setFontSize(12);
			doc.text('KASIR MICHI', pageWidth / 2, 26, { align: 'center' });
			doc.setFontSize(11);
			doc.text(titleLabel, pageWidth / 2, 34, { align: 'center' });
			let startY = 44;
			// Summary
			doc.setFontSize(10);
			const pemasukanText = `Total Pemasukan : ${formatCurrency(laporanData.totalPemasukan)}`;
			const pengeluaranText = `Total Pengeluaran: ${formatCurrency(laporanData.totalPengeluaran)}`;
			const labaText = `Laba / Rugi : ${formatCurrency(laporanData.laba)} ${laporanData.laba >= 0 ? '(Untung)' : '(Rugi)'}`;
			doc.text(pemasukanText, 14, startY);
			startY += 6;
			doc.text(pengeluaranText, 14, startY);
			startY += 6;
			doc.text(labaText, 14, startY);
			startY += 8;
			// Table (added Kategori column after Jenis)
			const head = [['Tanggal', 'Jam', 'Jenis', 'Kategori', 'Keterangan', 'Jumlah', 'Ditambahkan Oleh']];
			const body = (sortedTransaksi || []).map(item => {
				const tanggal = item.tanggal ? (new Date(item.tanggal)).toLocaleDateString('id-ID') : '-';
				const waktu = formatTime(item.waktu || '-');
				const jenisRaw = item.jenis || '-';
				const jenis = jenisRaw ? (jenisRaw.charAt(0).toUpperCase() + jenisRaw.slice(1)) : '-';
				const kategori = jenisRaw === 'pengeluaran' ? (item.kategori_pengeluaran || '-') : '-';
				const keterangan = jenisRaw === 'pemasukan'
					? ((item.sumber && item.sumber.toString().trim() && item.sumber.toString().toLowerCase() !== 'manual')
						? item.sumber
						: (item.keterangan || '-'))
					: (item.keterangan || '-');
				const amount = item.jumlah ?? item.nominal ?? item.total ?? 0;
				const oleh = item.ditambahkan_oleh || '-';
				return [tanggal, waktu, jenis, kategori, keterangan, formatCurrency(amount), oleh];
			});
			const kategoriSummaryMap = (sortedTransaksi || []).reduce((acc, item) => {
				if (item?.jenis !== 'pengeluaran') return acc;
				const kategoriNama = String(item.kategori_pengeluaran || '').trim();
				if (!kategoriNama) return acc;
				const amount = Number(item.jumlah ?? item.nominal ?? item.total ?? 0);
				acc[kategoriNama] = (acc[kategoriNama] || 0) + amount;
				return acc;
			}, {});
			const kategoriSummaryRows = Object.entries(kategoriSummaryMap).map(([kategori, total]) => [kategori, formatCurrency(total)]);
			autoTable(doc, {
				startY: startY,
				head: head,
				body: body,
				styles: { fontSize: 10 },
				headStyles: { fillColor: [249, 115, 22], textColor: 255 },
				alternateRowStyles: { fillColor: [255, 247, 243] },
				bodyStyles: { fillColor: [255, 255, 255] },
				margin: { left: 14, right: 14 },
				didParseCell: function(data) {
					// color the Jumlah column (index 5) based on Jenis (we added Kategori column)
						if (data.column.index === 5 && data.section === 'body') {
							const jenisCell = data.row.raw[2] || '';
							if (jenisCell === 'Pemasukan') {
								data.cell.styles.textColor = [22, 163, 74];
							} else {
								data.cell.styles.textColor = [220, 38, 38];
							}
							data.cell.styles.fontStyle = 'bold';
						}
				}
			});
			const summaryStartY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 30;
			if (kategoriSummaryRows.length > 0) {
				doc.setFontSize(11);
				doc.setFont('helvetica', 'bold');
				doc.setTextColor(0);
				doc.text('Ringkasan Pengeluaran Berdasarkan Kategori', 14, summaryStartY + 12);
				autoTable(doc, {
					startY: summaryStartY + 18,
					head: [['Kategori', 'Total Pengeluaran']],
					body: kategoriSummaryRows,
					styles: { fontSize: 10 },
					headStyles: { fillColor: [249, 115, 22], textColor: 255 },
					alternateRowStyles: { fillColor: [255, 247, 243] },
					bodyStyles: { fillColor: [255, 255, 255] },
					margin: { left: 14, right: 14 }
				});
			}
			// Totals are shown in the summary above; no totals printed here.
			// Footer printed date
			doc.setFontSize(8);
			doc.setFont('helvetica', 'normal');
			doc.setTextColor(150);
			doc.text(
				`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`,
				pageWidth / 2, pageHeight - 10, { align: 'center' }
			);
			const fileName = `Laporan_${monthName}_${tahun}.pdf`;
			doc.save(fileName);
		} catch (err) {
			console.error('PDF export error:', err);
			alert('Gagal mengekspor PDF.');
		}
	};

	// Fungsi ini membuat file Excel dengan format tabel yang bisa langsung dibuka di spreadsheet.
	const exportExcel = () => {
		// Log that owner is exporting Excel
		logAktivitas('Export Excel Laporan Bulanan');
		try {
			const monthName = bulanNames[parseInt(bulan, 10) - 1];
			const titleLabel = (startDate && endDate) ? `${startDate} - ${endDate}` : `${monthName} ${tahun}`;
			const fileName = `Laporan_${monthName}_${tahun}.xlsx`;
			const wb = XLSX.utils.book_new();
			const aoa = [];
			// Title and month/year
			aoa.push(["LAPORAN KEUANGAN BULANAN - KASIR MICHI"]);
			aoa.push([titleLabel]);
			aoa.push([]);
			// Summary rows
			aoa.push(["Total Pemasukan", `Rp ${Number(laporanData.totalPemasukan).toLocaleString('id-ID')}`]);
			aoa.push(["Total Pengeluaran", `Rp ${Number(laporanData.totalPengeluaran).toLocaleString('id-ID')}`]);
			aoa.push(["Laba/Rugi", `Rp ${Number(laporanData.laba).toLocaleString('id-ID')} (${laporanData.laba >= 0 ? 'Untung' : 'Rugi'})`]);
			aoa.push([]);
			// Header (added Kategori after Jenis)
			aoa.push(["Tanggal", "Jam", "Jenis", "Kategori", "Keterangan", "Jumlah", "Ditambahkan Oleh"]);
			// Data rows (include Kategori column)
			(sortedTransaksi || []).forEach(item => {
				const tanggal = item.tanggal ? (new Date(item.tanggal)).toLocaleDateString('id-ID') : '-';
				const waktu = formatTime(item.waktu || '-');
				const jenisRaw = item.jenis || '-';
				const jenis = jenisRaw ? (jenisRaw.charAt(0).toUpperCase() + jenisRaw.slice(1)) : '-';
				const kategori = jenisRaw === 'pengeluaran' ? (item.kategori_pengeluaran || '-') : '-';
				const keterangan = jenisRaw === 'pemasukan'
					? ((item.sumber && item.sumber.toString().trim() && item.sumber.toString().toLowerCase() !== 'manual')
						? item.sumber
						: (item.keterangan || '-'))
					: (item.keterangan || '-');
				const amount = item.jumlah ?? item.nominal ?? item.total ?? 0;
				const oleh = item.ditambahkan_oleh || '-';
				aoa.push([tanggal, waktu, jenis, kategori, keterangan, `Rp ${Number(amount).toLocaleString('id-ID')}`, oleh]);
			});
			const kategoriSummaryMapExcel = (sortedTransaksi || []).reduce((acc, item) => {
				if (item?.jenis !== 'pengeluaran') return acc;
				const kategoriNama = String(item.kategori_pengeluaran || '').trim();
				if (!kategoriNama) return acc;
				const amount = Number(item.jumlah ?? item.nominal ?? item.total ?? 0);
				acc[kategoriNama] = (acc[kategoriNama] || 0) + amount;
				return acc;
			}, {});
			const kategoriSummaryRowsExcel = Object.entries(kategoriSummaryMapExcel).map(([kategori, total]) => [kategori, `Rp ${Number(total).toLocaleString('id-ID')}`]);
			aoa.push([]);
			aoa.push(["Ringkasan Pengeluaran Berdasarkan Kategori"]);
			aoa.push(["Kategori", "Total Pengeluaran"]);
			kategoriSummaryRowsExcel.forEach(row => aoa.push(row));
			// Printed date row (align to last column)
			aoa.push([]);
			aoa.push(['', '', '', '', '', '', `Dicetak: ${new Date().toLocaleDateString('id-ID')}`]);
			const ws = XLSX.utils.aoa_to_sheet(aoa);
			// Column widths
			do {
				ws['!cols'] = [
					{ wch: 12 }, // Tanggal
					{ wch: 10 }, // Waktu
					{ wch: 14 }, // Jenis
					{ wch: 12 }, // Kategori
					{ wch: 20 }, // Keterangan
					{ wch: 16 }, // Jumlah
					{ wch: 10 }, // Oleh
				];
			} while(false);
			// Bold header row (may be ignored by some XLSX consumers)
			const headerRowNumber = aoa.findIndex(row => row[0] === 'Tanggal') + 1;
			if (headerRowNumber > 0) {
				const cols = ['A','B','C','D','E','F','G'];
				cols.forEach(col => {
					const cell = ws[`${col}${headerRowNumber}`];
					if (cell) cell.s = { font: { bold: true } };
				});
			}
			XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${tahun}`);
			XLSX.writeFile(wb, fileName);
		} catch (err) {
			console.error('Excel export error:', err);
			alert('Gagal mengekspor Excel.');
		}
	};

	// Fungsi ini memilih format export yang dipilih user, apakah PDF atau Excel.
	const handleDownload = () => {
		if (exportFormat === 'pdf') {
			exportPDF();
		} else {
			exportExcel();
		}
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	};

	const bulanNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

		const rawTransaksi = laporanData.transaksi || [];

		const getTimestamp = (item) => {
			if (!item) return 0;
			if (item.ts) return Number(item.ts) * 1000; // backend ts in seconds -> ms
			try {
				const dt = new Date(`${item.tanggal} ${item.waktu}`);
				if (!isNaN(dt)) return dt.getTime();
				if (item.tanggal) {
					const parts = ('' + item.tanggal).split('-');
					if (parts.length >= 3) {
						const t = item.waktu || '00:00:00';
						return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T${t}`).getTime();
					}
				}
			} catch (e) {
				// ignore
			}
			return 0;
		};

		const sortedTransaksi = rawTransaksi.slice().sort((a, b) => getTimestamp(b) - getTimestamp(a));
		const sortedMenuSalesBulanan = [...menuSalesBulanan].sort((a, b) => Number(b.quantity) - Number(a.quantity));
		const topMenuSalesBulanan = sortedMenuSalesBulanan.slice(0, 5);
		const maxMenuQuantityBulanan = topMenuSalesBulanan.reduce((max, item) => Math.max(max, Number(item.quantity) || 0), 0);

		const pemasukanTransaksi = rawTransaksi.filter(t => t.jenis === 'pemasukan').length;
		const pengeluaranTransaksi = rawTransaksi.filter(t => t.jenis === 'pengeluaran').length;

	if (loading) {
		return (
			<div className="laporan-owner-bg">
				<div style={{ textAlign: 'center', padding: '50px' }}>
					<h2>Loading laporan data...</h2>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="laporan-owner-bg">
				<div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
					<h2>Error: {error}</h2>
					<button onClick={fetchLaporan} style={{ padding: '10px 20px', marginTop: '20px' }}>
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="laporan-owner-bg">
			<header className="dashboard-header">
				<div className="logo-section">
					<img src="/logimichi.jpg" alt="Logo Michi" className="logo-img" />
					<span className="logo-title">PEMILIK MICHI</span>
				</div>
				<NavbarPemilik />
			</header>
			<main className="laporan-main">
				<h1 className="laporan-main-title">LAPORAN BULANAN</h1>
				<div className="laporan-scroll">
					<div className="laporan-top-row">
					<div className="filter-card year-card">
						<label className="filter-item-label">Pilih Tahun</label>
						<select className="laporan-filter-select" value={tahun} onChange={e => setTahun(e.target.value)}>
							<option value="2025">2025</option>
							<option value="2026">2026</option>
							<option value="2027">2027</option>
							<option value="2028">2028</option>
							<option value="2029">2029</option>
							<option value="2030">2030</option>
							<option value="2031">2031</option>
							<option value="2032">2032</option>
							<option value="2033">2033</option>
							<option value="2034">2034</option>
							<option value="2035">2035</option>
							
						</select>
					</div>
					<div className="filter-card month-card">
						<label className="filter-item-label">Pilih Bulan</label>
						<select className="laporan-filter-select" value={bulan} onChange={e => setBulan(e.target.value)}>
							<option value="01">Januari</option>
							<option value="02">Februari</option>
							<option value="03">Maret</option>
							<option value="04">April</option>
							<option value="05">Mei</option>
							<option value="06">Juni</option>
							<option value="07">Juli</option>
							<option value="08">Agustus</option>
							<option value="09">September</option>
							<option value="10">Oktober</option>
							<option value="11">November</option>
							<option value="12">Desember</option>
						</select>
					</div>
					<div className="filter-card range-card">
						<label className="filter-item-label">Pilih Rentang Tanggal</label>
						<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
							<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
							<span style={{ padding: '0 6px' }}>—</span>
							<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
							<button className="laporan-filter-apply" onClick={fetchLaporan} style={{ marginLeft: 8 }}>Apply</button>
						</div>
					</div>
					<div className="filter-card format-card">
						<label className="filter-item-label">Export laporan</label>
						<select className="laporan-filter-select" value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
							<option value="pdf">PDF</option>
							<option value="excel">Excel</option>
						</select>
						<button className="download-btn" onClick={handleDownload}>Download</button>
					</div>
				</div>
				<div className="laporan-cards">
					<div className="laporan-card pemasukan">
						<div className="laporan-card-icon">💰</div>
						<div className="laporan-card-content">
							<div className="laporan-card-title">Total Pemasukan</div>
							<div className="laporan-card-value">{formatCurrency(laporanData.totalPemasukan)}</div>
							<div className="laporan-card-desc">{pemasukanTransaksi} Transaksi</div>
						</div>
					</div>
					<div className="laporan-card pengeluaran">
						<div className="laporan-card-icon">💸</div>
						<div className="laporan-card-content">
							<div className="laporan-card-title">Total Pengeluaran</div>
							<div className="laporan-card-value">{formatCurrency(laporanData.totalPengeluaran)}</div>
							<div className="laporan-card-desc">{pengeluaranTransaksi} Transaksi</div>
						</div>
					</div>
					<div className={`laporan-card laba ${laporanData.laba >= 0 ? 'positive' : 'negative'}`}>
						<div className="laporan-card-icon">📊</div>
						<div className="laporan-card-content">
							<div className="laporan-card-title">Laba Rugi</div>
							<div className="laporan-card-value">{formatCurrency(laporanData.laba)}</div>
							<div className="laporan-card-desc">{laporanData.laba >= 0 ? 'Untung' : 'Rugi'}</div>
						</div>
					</div>
				</div>
					{/* Grafik: di bawah summary card, judul di luar kotak seperti Dashboard */}
					<div className="laporan-table-title">Grafik Pemasukan & Pengeluaran</div>
					<GrafikLaporan bulan={`${tahun}-${bulan}`} showHeader={false} />
					{/* New: Pengeluaran per kategori */}
					<div className="laporan-table-title">Grafik Pengeluaran Berdasarkan Kategori</div>
					<div className="kategori-chart-card">
						<div className="kategori-chart-inner">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={pengeluaranKategori} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
								<CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e8e8e8" />
								<XAxis dataKey="kategori" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} dy={10} />
								<YAxis tickFormatter={(v) => `Rp ${Number(v).toLocaleString('id-ID')}`} tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
								<Tooltip formatter={(value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits:0 }).format(value)} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
								<Legend verticalAlign="bottom" />
								<Bar dataKey="total" name="Total Pengeluaran" fill="#dc2626" radius={[8,8,0,0]} barSize={36}>
									<LabelList dataKey="total" position="top" formatter={(value) => new Intl.NumberFormat('id-ID').format(value)} fill="#991b1b" style={{ fontSize: 12, fontWeight: 700 }} />
								</Bar>
							</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
					<div className="menu-sales-section">
						<div className="laporan-table-title">STATISTIK MENU TERLARIS BULAN INI</div>
						<div className="menu-sales-card">
							<div className="menu-sales-card-header">
								<div className="sales-filter-field sales-filter-inline">
									<label htmlFor="menu-bulanan-filter">Filter</label>
									<select
										id="menu-bulanan-filter"
										className="sales-filter-select"
										value={menuFilterBulanan}
										onChange={(e) => setMenuFilterBulanan(e.target.value)}
									>
										{menuOptionsBulanan.map((option) => (
											<option key={option} value={option}>{option}</option>
										))}
									</select>
								</div>
							</div>
							<div className="sales-chart-body">
								{menuLoadingBulanan ? (
									<div className="sales-no-data">Loading statistik penjualan...</div>
								) : menuErrorBulanan ? (
									<div className="sales-no-data" style={{ color: 'red' }}>Error: {menuErrorBulanan}</div>
								) : topMenuSalesBulanan.length === 0 ? (
									<div className="sales-no-data">Belum ada data penjualan.</div>
								) : (
									<div className="menu-sales-card-list">
										{topMenuSalesBulanan.map((item, idx) => {
											const quantity = Number(item.quantity) || 0;
											const widthPercent = maxMenuQuantityBulanan ? Math.round((quantity / maxMenuQuantityBulanan) * 100) : 0;
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
					<div>
						<div className="laporan-table-title">DETAIL TRANSAKSI - {bulanNames[parseInt(bulan) - 1]} {tahun}</div>
						<div className="owner-laporan-table-box">
							<div className="laporan-table-wrapper">
								<table className="laporan-table">
								<thead>
									<tr>
										<th>Tanggal</th>
										<th>Jam</th>
										<th>Jenis</th>
										<th>Kategori</th>
										<th>Keterangan</th>
										<th>Jumlah</th>
										<th>Ditambahkan oleh</th>
									</tr>
								</thead>
								<tbody>
									{sortedTransaksi.length > 0 ? (
										sortedTransaksi.map((item, idx) => {
											const parseDate = (d) => {
												if (!d) return '-';
												// expect YYYY-MM-DD or ISO; output M/D/YYYY without leading zeros
												const dt = new Date(d);
												if (isNaN(dt)) {
													// try split if format is YYYY-MM-DD
													const parts = (''+d).split('-');
													if (parts.length >= 3) return `${Number(parts[1])}/${Number(parts[2])}/${parts[0]}`;
													return d;
												}
												return `${dt.getMonth()+1}/${dt.getDate()}/${dt.getFullYear()}`;
											}
											const amount = item.jumlah ?? item.nominal ?? item.total ?? 0;
											return (
												<tr key={idx}>
														<td>{parseDate(item.tanggal)}</td>
														<td>{formatTime(item.waktu)}</td>
												<td><span className={item.jenis === "pemasukan" ? "laporan-badge pemasukan" : "laporan-badge pengeluaran"}>{item.jenis}</span></td>
												<td>{item.jenis === 'pengeluaran' ? (item.kategori_pengeluaran || '-') : '-'}</td>
												<td>{item.jenis === "pemasukan"
													? ((item.sumber && item.sumber !== 'owner' && item.sumber.toString().toLowerCase() !== 'manual') ? item.sumber : (item.keterangan || '-'))
													: (item.keterangan || '-')
												}</td>
												<td>{formatCurrency(amount)}</td>
												<td>
													<span className={`laporan-badge ${getBadgeClass(item.ditambahkan_oleh)}`}>
														{item.ditambahkan_oleh === 'owner' ? 'pemilik' : item.ditambahkan_oleh}</span>
												</td>
												</tr>
											)
										})
									) : (
										<tr>
											<td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
												Tidak Ada Transaksi Untuk Bulan Ini
											</td>
										</tr>
									)}
								</tbody>
							</table>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

export default LaporanBulananPemilik;

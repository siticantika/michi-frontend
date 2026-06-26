import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/laporan.css";
import GrafikLaporan from "../../components/GrafikLaporan";
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
	const [exportFormat, setExportFormat] = useState('pdf');
	const [laporanData, setLaporanData] = useState({
		totalPemasukan: 0,
		totalPengeluaran: 0,
		laba: 0,
		transaksi: []
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchLaporan();

		// NOTE: removed automatic polling to avoid flicker/refresh.
		// If manual refresh is desired, user can reload the page or we can add a button.

		return () => {};
	}, [tahun, bulan]);

	// Bagian ini mengambil data laporan bulanan dari backend.
	// Data ini dipakai untuk menampilkan ringkasan keuangan dan daftar transaksi per bulan.
	// Fungsi ini mengambil data laporan dari backend untuk ditampilkan sesuai bulan yang dipilih.
	const fetchLaporan = async () => {
		try {
			setLoading(true);
			setError(null);
			const token = localStorage.getItem('token');
			const response = await fetch(`${API}/api/owner/laporan-bulanan?bulan=${tahun}-${bulan}`, {
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
			// Header centered
			doc.setFontSize(16);
			doc.text('LAPORAN KEUANGAN BULANAN', pageWidth / 2, 18, { align: 'center' });
			doc.setFontSize(12);
			doc.text('KASIR MICHI', pageWidth / 2, 26, { align: 'center' });
			doc.setFontSize(11);
			doc.text(`${monthName} ${tahun}`, pageWidth / 2, 34, { align: 'center' });
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
			// Table
			const head = [['Tanggal', 'Waktu', 'Jenis', 'Keterangan', 'Jumlah', 'Oleh']];
			const body = (sortedTransaksi || []).map(item => {
				const tanggal = item.tanggal ? (new Date(item.tanggal)).toLocaleDateString('id-ID') : '-';
				const waktu = formatTime(item.waktu || '-');
				const jenisRaw = item.jenis || '-';
				const jenis = jenisRaw ? (jenisRaw.charAt(0).toUpperCase() + jenisRaw.slice(1)) : '-';
				const keterangan = jenisRaw === 'pemasukan'
					? ((item.sumber && item.sumber.toString().trim() && item.sumber.toString().toLowerCase() !== 'manual')
						? item.sumber
						: (item.keterangan || '-'))
					: (item.keterangan || '-');
				const amount = item.jumlah ?? item.nominal ?? item.total ?? 0;
				const oleh = item.ditambahkan_oleh || '-';
				return [tanggal, waktu, jenis, keterangan, formatCurrency(amount), oleh];
			});
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
					// color the Jumlah column (index 4) based on Jenis
					if (data.column.index === 4 && data.section === 'body') {
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
			const fileName = `Laporan_${monthName}_${tahun}.xlsx`;
			const wb = XLSX.utils.book_new();
			const aoa = [];
			// Title and month/year
			aoa.push(["LAPORAN KEUANGAN BULANAN - KASIR MICHI"]);
			aoa.push([`${monthName} ${tahun}`]);
			aoa.push([]);
			// Summary rows
			aoa.push(["Total Pemasukan", `Rp ${Number(laporanData.totalPemasukan).toLocaleString('id-ID')}`]);
			aoa.push(["Total Pengeluaran", `Rp ${Number(laporanData.totalPengeluaran).toLocaleString('id-ID')}`]);
			aoa.push(["Laba/Rugi", `Rp ${Number(laporanData.laba).toLocaleString('id-ID')} (${laporanData.laba >= 0 ? 'Untung' : 'Rugi'})`]);
			aoa.push([]);
			// Header
			aoa.push(["Tanggal", "Waktu", "Jenis", "Keterangan", "Jumlah", "Oleh"]);
			// Data rows
			(sortedTransaksi || []).forEach(item => {
				const tanggal = item.tanggal ? (new Date(item.tanggal)).toLocaleDateString('id-ID') : '-';
				const waktu = formatTime(item.waktu || '-');
				const jenisRaw = item.jenis || '-';
				const jenis = jenisRaw ? (jenisRaw.charAt(0).toUpperCase() + jenisRaw.slice(1)) : '-';
				const keterangan = jenisRaw === 'pemasukan'
					? ((item.sumber && item.sumber.toString().trim() && item.sumber.toString().toLowerCase() !== 'manual')
						? item.sumber
						: (item.keterangan || '-'))
					: (item.keterangan || '-');
				const amount = item.jumlah ?? item.nominal ?? item.total ?? 0;
				const oleh = item.ditambahkan_oleh || '-';
				aoa.push([tanggal, waktu, jenis, keterangan, `Rp ${Number(amount).toLocaleString('id-ID')}`, oleh]);
			});
			// Printed date row
			aoa.push([]);
			aoa.push(['', '', '', '', `Dicetak: ${new Date().toLocaleDateString('id-ID')}`]);
			const ws = XLSX.utils.aoa_to_sheet(aoa);
			// Column widths
			do {
				ws['!cols'] = [
					{ wch: 12 }, // Tanggal
					{ wch: 10 }, // Waktu
					{ wch: 14 }, // Jenis
					{ wch: 20 }, // Keterangan
					{ wch: 16 }, // Jumlah
					{ wch: 10 }, // Oleh
				];
			} while(false);
			// Bold header row (may be ignored by some XLSX consumers)
			const headerRowNumber = aoa.findIndex(row => row[0] === 'Tanggal') + 1;
			if (headerRowNumber > 0) {
				const cols = ['A','B','C','D','E','F'];
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
										<th>Sumber/Keterangan</th>
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
														<td>{item.jenis === "pemasukan"
															? ((item.sumber && item.sumber !== 'owner' && item.sumber.toString().toLowerCase() !== 'manual') ? item.sumber : (item.keterangan || '-'))
															: (item.keterangan || '-')
														}</td>
														<td>{formatCurrency(amount)}</td>
														<td>
															<span className={`laporan-badge ${getBadgeClass(item.ditambahkan_oleh)}`}>
  																{item.ditambahkan_oleh === 'owner' ? 'pemilik' : item.ditambahkan_oleh}</span></td>
												</tr>
											)
										})
									) : (
										<tr>
											<td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
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

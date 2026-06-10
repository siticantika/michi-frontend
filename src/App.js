import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/kasir/dashboard';
import TambahMenu from './pages/kasir/TambahMenu';
import Transaksi from './pages/kasir/transaksi';
import Pengeluaran from './pages/kasir/pengeluaran';
import HalamanAwal from './pages/HalamanAwal';
import LoginKasir from './pages/kasir/Loginkasir';
import LoginPemilik from './pages/pemilik/LoginPemilik';
import LoginAdmin from './pages/admin/LoginAdmin';
import DashboardAdmin from './pages/admin/DashboardAdmin';
import DashboardPemilik from './pages/pemilik/DashboardPemilik';
import PengeluaranPemilik from './pages/pemilik/PengeluaranPemilik';
import PemasukanPemilik from './pages/pemilik/pemasukan';
import LaporanBulananPemilik from './pages/pemilik/laporan';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HalamanAwal />} />
        <Route path="/kasir/dashboard" element={<Dashboard />} />
        <Route path="/kasir/tambahmenu" element={<TambahMenu />} />
        <Route path="/kasir/transaksi" element={<Transaksi />} />
        <Route path="/kasir/pengeluaran" element={<Pengeluaran />} />
        <Route path="/kasir/loginkasir" element={<LoginKasir />} />
        <Route path="/pemilik/login" element={<LoginPemilik />} />
        <Route path="/pemilik/dashboard" element={<DashboardPemilik />} />
        <Route path="/pemilik/pengeluaran" element={<PengeluaranPemilik />} />
        <Route path="/pemilik/pemasukan" element={<PemasukanPemilik />} />
        <Route path="/pemilik/laporan" element={<LaporanBulananPemilik />} />
        <Route path="/kasir/LoginKasir" element={<LoginKasir />} />
        <Route path="/admin/login" element={<LoginAdmin />} />
        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
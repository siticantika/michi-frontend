import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import '../styles/grafik.css';

const dummyDataFor = (bulan) => {
  // generate dummy data for given YYYY-MM
  const [y, m] = bulan.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const data = [];
  for (let d = 1; d <= days; d++) {
    const day = d.toString().padStart(2, '0');
    data.push({ date: `${m}/${day}`, pemasukan: Math.floor(Math.random() * 200000) + 20000, pengeluaran: Math.floor(Math.random() * 150000) });
  }
  return data;
}

export default function GrafikLaporan({ bulan, showHeader = true }) {
  const [data, setData] = useState([]);
  const API = process.env.REACT_APP_API_URL;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const base = process.env.REACT_APP_API_URL;

useEffect(() => {
  let mounted = true;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');

      // 🔥 FIX PENTING DI SINI
      const res = await fetch(
        `${base}/api/owner/grafik-bulanan?bulan=${bulan}`,
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        }
      );

      if (!res.ok) throw new Error(`Grafik API responded ${res.status}`);

      const json = await res.json();

      const raw = (json.data || []).map(item => ({
        date: (item.date || '').slice(0,10),
        pemasukan: Number(item.pemasukan) || 0,
        pengeluaran: Number(item.pengeluaran) || 0
      }));

      const [y, m] = (bulan || '').split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();

      const byDate = {};
      raw.forEach(r => {
        if (r.date) byDate[r.date] = r;
      });

      const full = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const day = String(d).padStart(2, '0');
        const key = `${y}-${String(m).padStart(2,'0')}-${day}`;
        const entry = byDate[key] || { pemasukan: 0, pengeluaran: 0 };
        full.push({ date: key, ...entry });
      }

      if (mounted) setData(full);

    } catch (err) {
      console.error('Grafik fetch error', err);
      if (mounted) {
        setError(err.message);
        setData([]);
      }
    } finally {
      if (mounted) setLoading(false);
    }
  };

  fetchData();

  return () => { mounted = false };
}, [bulan]);

  return (
    <div className="grafik-card">
      {showHeader && (
        <div className="grafik-header">
          <h3>Grafik Pemasukan & Pengeluaran</h3>
        </div>
      )}
      <div className="grafik-body">
        {loading && <div className="grafik-loading">Loading...</div>}
        {!loading && error && <div className="grafik-loading" style={{ color: 'red' }}>Error: {error}</div>}
        {!loading && !error && (
          <div className="grafik-scroll" style={{ overflowX: 'auto' }}>
            {/* inner width depends on number of days; allow horizontal scroll when wide */}
            <div className="grafik-inner" style={{ width: Math.max(data.length * 48, 800), minWidth: 800 }}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f7e9e9" />
                  <XAxis dataKey="date" interval={0} tick={{ fill: '#6d2c00' }} tickFormatter={(d) => (d ? d.slice(8,10) : d)} />
                  <YAxis tickFormatter={(v) => new Intl.NumberFormat('id-ID').format(v)} tick={{ fill: '#6d2c00' }} />
                  <Tooltip formatter={(v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits:0 }).format(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="pemasukan" stroke="#16a34a" strokeWidth={3} dot={false} name="Pemasukan" />
                  <Line type="monotone" dataKey="pengeluaran" stroke="#dc2626" strokeWidth={3} dot={false} name="Pengeluaran" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

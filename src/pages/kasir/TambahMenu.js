import React, { useState, useEffect } from 'react';
// import { useMenu } from '../../context/MenuContext';
import { useNavigate } from 'react-router-dom';
import '../../styles/TambahMenu.css';
import Navbar from '../../components/Navbar';

const initialMenus = [
  {
    nama: 'Paket Hemat Big',
    emoji: '🍗🥤',
    harga: '18000',
    kategori: 'Makanan',
    deskripsi: 'Chicken Crispy Big+Nasi+Es Teh',
    varian: true,
    level: false,
    label: 'Varian',
  },
  {
    nama: 'Mie Cian Ori',
    emoji: '🍜',
    harga: '22000',
    kategori: 'Makanan',
    deskripsi: 'Level 0-5',
    varian: false,
    level: true,
    label: 'Level',
  },
  {
    nama: 'Paket Hemat Small',
    emoji: '🍗🥤',
    harga: '15000',
    kategori: 'Makanan',
    deskripsi: 'Chicken Crispy Big+Nasi+Es Teh',
    varian: true,
    level: false,
    label: 'Varian',
  },
  {
    nama: 'Chicken Pop',
    emoji: '🍢',
    harga: '10000',
    kategori: 'Makanan',
    deskripsi: 'Sambal Matah',
    varian: false,
    level: false,
    label: '',
  },
  {
    nama: 'Single Crispy',
    emoji: '🍗',
    harga: '10000',
    kategori: 'Makanan',
    deskripsi: 'Paha Bawah',
    varian: false,
    level: false,
    label: '',
  },
];



function TambahMenu() {
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [addForm, setAddForm] = useState({
    nama: '',
    emoji: '',
    harga: '',
    kategori: '',
    deskripsi: ''
  });
  const [varianList, setVarianList] = useState([]);
  const [levelList, setLevelList] = useState([]);
  const [varianInput, setVarianInput] = useState('');
  const [levelInput, setLevelInput] = useState('');
  const [showVarian, setShowVarian] = useState(false);
  const [showLevel, setShowLevel] = useState(false);
  const [activeType, setActiveType] = useState('makanan');
  const [search, setSearch] = useState('');
  const [editMenuIdx, setEditMenuIdx] = useState(null);
  const [editForm, setEditForm] = useState({
    emoji: '',
    nama: '',
    deskripsi: '',
    harga: ''
  });
  const [showDeleteIdx, setShowDeleteIdx] = useState(null);

  // Fetch menu dari backend
  useEffect(() => {
    fetch(`${API}/tes-menu`)
      .then(res => res.json())
      .then(data => setMenus(data.map(menu => {
        // Pastikan varian/level berupa array jika ada
        let varianArr = menu.varian;
        let levelArr = menu.level;
        if (typeof varianArr === 'string') {
          varianArr = varianArr.split(',').map(v => v.trim()).filter(Boolean);
        }
        if (typeof levelArr === 'string') {
          levelArr = levelArr.split(',').map(l => l.trim()).filter(Boolean);
        }
        // Tentukan label
        let label = '';
        if (varianArr && varianArr.length > 0) label = 'Varian';
        else if (levelArr && levelArr.length > 0) label = 'Level';
        return {
          ...menu,
          emoji: menu.emoji || menu.icon || '',
          varian: varianArr,
          level: levelArr,
          label,
        };
      })))
      .catch(() => setMenus([]));
  }, []);

  // Fungsi untuk edit menu
  const editMenu = async (idx, updatedMenu) => {
    try {
      const menu = menus[idx];
      const res = await fetch(`${API}/menu/${menu.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          nama: updatedMenu.nama,
          icon: updatedMenu.emoji,
          harga: updatedMenu.harga,
          kategori: menu.kategori,
          deskripsi: updatedMenu.deskripsi,
          varian: updatedMenu.varian, // gunakan hasil edit terbaru
          level: updatedMenu.level,   // gunakan hasil edit terbaru
        })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Gagal update menu');
        return;
      }
      // Refresh menu
      const menuRes = await fetch(`${API}/tes-menu`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const menuData = await menuRes.json();
      setMenus(menuData.map(menu => {
        let varianArr = menu.varian;
        let levelArr = menu.level;
        if (typeof varianArr === 'string') {
          varianArr = varianArr.split(',').map(v => v.trim()).filter(Boolean);
        }
        if (typeof levelArr === 'string') {
          levelArr = levelArr.split(',').map(l => l.trim()).filter(Boolean);
        }
        let label = '';
        if (varianArr && varianArr.length > 0) label = 'Varian';
        else if (levelArr && levelArr.length > 0) label = 'Level';
        return {
          ...menu,
          emoji: menu.emoji || menu.icon || '',
          varian: varianArr,
          level: levelArr,
          label,
        };
      }));
    } catch (err) {
      alert('Gagal terhubung ke server');
    }
  };

  // Fungsi untuk delete menu
  const deleteMenu = async (idx) => {
    try {
      const menu = menus[idx];
      const res = await fetch(`${API}/menu/${menu.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Gagal hapus menu');
        return;
      }
      // Refresh menu
      const menuRes = await fetch(`${API}/tes-menu`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const menuData = await menuRes.json();
      setMenus(menuData.map(menu => ({
        ...menu,
        emoji: menu.emoji || menu.icon || '',
      })));
    } catch (err) {
      alert('Gagal terhubung ke server');
    }
  };

  // Filter menu sesuai tipe dan pencarian
  const filteredMenus = menus
    .map((menu, idx) => ({ ...menu, globalIdx: idx }))
    .filter(menu => {
      const kategori = (menu.kategori || '').toString().toLowerCase();
      const categoryMatch = !kategori || (
        (activeType === 'makanan' && kategori === 'makanan') ||
        (activeType === 'minuman' && kategori === 'minuman') ||
        (activeType !== 'makanan' && activeType !== 'minuman')
      );
      const q = (search || '').trim().toLowerCase();
      const name = (menu.nama || '').toString().toLowerCase();
      const desc = (menu.deskripsi || '').toString().toLowerCase();
      const searchMatch = q === '' || name.includes(q) || desc.includes(q);
      return categoryMatch && searchMatch;
    });

  // Edit popup logic
  const openEditPopup = (idx) => {
    setEditMenuIdx(idx);
    const menu = menus[idx];
    setEditForm({
      emoji: menu.emoji,
      nama: menu.nama,
      deskripsi: menu.deskripsi,
      harga: menu.harga,
      varian: Array.isArray(menu.varian) ? menu.varian : (menu.varian ? [menu.varian] : []),
      level: Array.isArray(menu.level) ? menu.level : (menu.level ? [menu.level] : []),
    });
    setShowVarian(menu.varian && menu.varian.length > 0);
    setShowLevel(menu.level && menu.level.length > 0);
    setVarianList(Array.isArray(menu.varian) ? menu.varian : (menu.varian ? [menu.varian] : []));
    setLevelList(Array.isArray(menu.level) ? menu.level : (menu.level ? [menu.level] : []));
  };
  const closeEditPopup = () => {
    setEditMenuIdx(null);
  };
  const handleEditChange = e => {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  };
  const handleEditSubmit = e => {
    e.preventDefault();
    editMenu(editMenuIdx, {
      emoji: editForm.emoji,
      nama: editForm.nama,
      deskripsi: editForm.deskripsi,
      harga: editForm.harga,
      varian: showVarian && varianList.length > 0 ? varianList.join(',') : null,
      level: showLevel && levelList.length > 0 ? levelList.join(',') : null,
    });
    setEditMenuIdx(null);
  };

  // Delete popup logic
  const openDeletePopup = (idx) => {
    setShowDeleteIdx(idx);
  };
  const closeDeletePopup = () => {
    setShowDeleteIdx(null);
  };
  const handleDelete = () => {
    deleteMenu(showDeleteIdx);
    setShowDeleteIdx(null);
  };

const handleSubmit = async (e) => {
  if (e && e.preventDefault) e.preventDefault();
  try {
    const res = await fetch(`${API}/menu/tambah`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        nama: addForm.nama,
        icon: addForm.emoji,
        harga: addForm.harga,
        kategori: addForm.kategori,
        deskripsi: addForm.deskripsi || null,
        varian: showVarian && varianList.length > 0 ? varianList.join(',') : null,
        level: showLevel && levelList.length > 0 ? levelList.join(',') : null
      })
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.message || 'Gagal menambah menu');
      return;
    }

    // refresh menu
    const menuRes = await fetch(`${API}/tes-menu`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const menuData = await menuRes.json();

    setMenus(menuData.map(menu => ({
      ...menu,
      emoji: menu.emoji || menu.icon || '',
    })));

    setShowPopup(false);
  } catch (err) {
    alert('Gagal terhubung ke server');
  }
};

  return (
    <div className="tambahmenu-container">
      <header className="dashboard-header">
        <div className="logo-section">
          <img src="/logimichi.jpg" alt="Logo Michi" className="logo-img" />
          <span className="logo-title">KASIR MICHI</span>
        </div>
        <div className="header-search">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="search"
              placeholder="Cari Menu"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >✕</button>
            )}
          </div>
        </div>
        <Navbar />
      </header>
      <main className="tambahmenu-main">

          <h1 className="Tambahmenu-title">DAFTAR MENU</h1>
          <div className="tambahmenu-controls" style={{marginTop:'24px'}}>
            <div className="tambahmenu-type-btns">
              <button className={activeType === 'makanan' ? 'active' : ''} onClick={() => setActiveType('makanan')}>Makanan</button>
              <button className={activeType === 'minuman' ? 'active' : ''} onClick={() => setActiveType('minuman')}>Minuman</button>
            </div>
            <div className="tambahmenu-btn-wrapper">
              <button
                className="pengeluaran-tambah-btn"
                onClick={() => {
                  setAddForm({ nama: '', emoji: '', harga: '', kategori: '', deskripsi: '' });
                  setVarianList([]);
                  setLevelList([]);
                  setVarianInput('');
                  setLevelInput('');
                  setShowVarian(false);
                  setShowLevel(false);
                  setShowPopup(true);
                }}
              >
                + Tambah Menu
              </button>
            </div>
          </div>
          <div className="menu-cards">
            {filteredMenus.map((menu) => (
              <div className="tambahmenu-card" key={menu.globalIdx} style={{position:'relative'}}>
                {menu.label && (
                  <span className="menu-card-label" style={{position:'absolute',top:8,right:8,background:menu.label==='Varian'?'#e2c9a5':'#a5c9e2',color:'#a80000',padding:'2px 10px',borderRadius:'10px',fontSize:'0.5rem',fontWeight:'bold',zIndex:2}}>{menu.label}</span>

                )}
                <div className="menu-card-img">
                  {menu.img ? (
                    <img src={menu.img} alt={menu.nama} />
                  ) : (
                    <span style={{fontSize:'1.5rem'}}>{menu.emoji}</span>
                  )}
                </div>
                <div className="menu-card-title">{menu.nama}</div>
                <div className="tambahmenu-card-desc">{menu.deskripsi}</div>
                <div className="tambahmenu-card-price">Rp {parseInt(menu.harga).toLocaleString('id-ID')}</div>
                <div className="menu-card-actions">
                  <button className="tambahmenu-card-edit" onClick={() => openEditPopup(menu.globalIdx)} type="button">📝 Edit</button>
                  <button className="tambahmenu-card-delete" onClick={() => openDeletePopup(menu.globalIdx)} type="button">🗑 Hapus</button>
                </div>
              </div>
            ))}
          </div>
        {showPopup && (
          <div className="popup-overlay">
            <div className="popup-menu-wrapper">
              <div className="popup-menu-header">
                <span>Tambah Menu</span>
                <span className="popup-close" onClick={() => setShowPopup(false)}>✕</span>
              </div>
              <div className="popup-menu-body">
                <form className="popup-form" onSubmit={handleSubmit}>
                  <label>Nama Menu</label>
                  <input type="text" className="popup-input" value={addForm.nama} onChange={e => setAddForm(f => ({...f, nama: e.target.value}))} />
                  <label>Emoji Icon</label>
                  <input type="text" className="popup-input" value={addForm.emoji} onChange={e => setAddForm(f => ({...f, emoji: e.target.value}))} />
                  <label>Harga</label>
                  <input type="number" className="popup-input" value={addForm.harga} onChange={e => setAddForm(f => ({...f, harga: e.target.value}))} />
                  <label>Kategori</label>
                  <input type="text" className="popup-input" value={addForm.kategori} onChange={e => setAddForm(f => ({...f, kategori: e.target.value}))} placeholder="Makanan atau Minuman" />
                  <label>Deskripsi (Opsional)</label>
                  <textarea className="popup-textarea" rows={3} value={addForm.deskripsi} onChange={e => setAddForm(f => ({...f, deskripsi: e.target.value}))}></textarea>
                  <div className="popup-checkbox-row" onClick={() => setShowVarian(v => !v)}>
                    <span className={showVarian ? 'popup-checkbox checked' : 'popup-checkbox'}></span>
                    <label style={{cursor:'pointer'}}>Menu ini punya varian (Contoh : Sambal ijo, Sambal matah dll)</label>
                  </div>
                  {showVarian && (
                    <div className="popup-varian-section">
                      <div className="popup-varian-label">Daftar Varian</div>
                      <div className="popup-varian-list">
                        {varianList.map((v, idx) => (
                          <div key={idx} className="popup-varian-item">
                            {v}
                            <button type="button" className="popup-varian-remove" onClick={() => setVarianList(list => list.filter((_, i) => i !== idx))}>✖</button>
                          </div>
                        ))}
                        <div className="popup-varian-input-row">
                          <input type="text" className="popup-input" placeholder="Nama Varian (Contoh: Sambal Geprek)" value={varianInput} onChange={e => setVarianInput(e.target.value)} />
                          <button type="button" className="popup-varian-add" onClick={() => { if (varianInput.trim()) { setVarianList(list => [...list, varianInput.trim()]); setVarianInput(''); }}}>+ Tambah Varian</button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="popup-checkbox-row" onClick={() => setShowLevel(l => !l)}>
                    <span className={showLevel ? 'popup-checkbox checked-blue' : 'popup-checkbox'}></span>
                    <label style={{cursor:'pointer'}}>Menu ini punya Level (Contoh: Level 1-5 untuk kepedasan)</label>
                  </div>
                  {showLevel && (
                    <div className="popup-varian-section">
                      <div className="popup-varian-label">Daftar Level</div>
                      <div className="popup-varian-list">
                        {levelList.map((l, idx) => (
                          <div key={idx} className="popup-varian-item">
                            {l}
                            <button type="button" className="popup-varian-remove" onClick={() => setLevelList(list => list.filter((_, i) => i !== idx))}>✖</button>
                          </div>
                        ))}
                        <div className="popup-varian-input-row">
                          <input type="text" className="popup-input" placeholder="Level" value={levelInput} onChange={e => setLevelInput(e.target.value)} />
                          <button type="button" className="popup-varian-add" onClick={() => { if (levelInput.trim()) { setLevelList(list => [...list, levelInput.trim()]); setLevelInput(''); }}}>+ Tambah Level</button>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>
              <div className="popup-menu-footer">
                <button type="button" className="popup-save-btn" onClick={handleSubmit}>
                  <span style={{marginRight:'8px'}}>💾</span>
                  <span>Simpan Menu</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Menu Popup */}
        {editMenuIdx !== null && (
          <div className="popup-overlay">
            <div className="popup-menu-wrapper">
              <div className="popup-menu-header">
                <span>Edit Menu</span>
                <span className="popup-close" onClick={closeEditPopup}>✕</span>
              </div>
              <div className="popup-menu-body">
                <form className="popup-form" onSubmit={handleEditSubmit}>
                  <label>Icon Menu</label>
                  <input type="text" className="popup-input" name="emoji" value={editForm.emoji} onChange={handleEditChange} />
                  <label>Nama Menu</label>
                  <input type="text" className="popup-input" name="nama" value={editForm.nama} onChange={handleEditChange} />
                  <label>Keterangan Menu</label>
                  <input type="text" className="popup-input" name="deskripsi" value={editForm.deskripsi} onChange={handleEditChange} />
                  <label>Harga Menu</label>
                  <input type="number" className="popup-input" name="harga" value={editForm.harga} onChange={handleEditChange} />
                  <div className="popup-checkbox-row">
                    <span className={showVarian ? 'popup-checkbox checked' : 'popup-checkbox'} onClick={() => setShowVarian(v => !v)}></span>
                    <label onClick={() => setShowVarian(v => !v)} style={{cursor:'pointer'}}>Menu ini punya varian</label>
                  </div>
                  {showVarian && (
                    <div className="popup-varian-section">
                      <div className="popup-varian-label">Daftar Varian</div>
                      <div className="popup-varian-list">
                        {varianList.map((v, idx) => (
                          <div key={idx} className="popup-varian-item">
                            {v}
                            <button type="button" className="popup-varian-remove" onClick={() => setVarianList(list => list.filter((_, i) => i !== idx))}>✖</button>
                          </div>
                        ))}
                        <div className="popup-varian-input-row">
                          <input
                            type="text"
                            className="popup-input"
                            placeholder="Nama Varian"
                            value={varianInput}
                            onChange={e => setVarianInput(e.target.value)}
                          />
                          <button type="button" className="popup-varian-add" onClick={() => {
                            if (varianInput.trim()) {
                              setVarianList(list => [...list, varianInput.trim()]);
                              setVarianInput('');
                            }
                          }}>+ Tambah Varian</button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="popup-checkbox-row">
                    <span className={showLevel ? 'popup-checkbox checked-blue' : 'popup-checkbox'} onClick={() => setShowLevel(l => !l)}></span>
                    <label onClick={() => setShowLevel(l => !l)} style={{cursor:'pointer'}}>Menu ini punya Level</label>
                  </div>
                  {showLevel && (
                    <div className="popup-varian-section">
                      <div className="popup-varian-label">Daftar Level</div>
                      <div className="popup-varian-list">
                        {levelList.map((l, idx) => (
                          <div key={idx} className="popup-varian-item">
                            {l}
                            <button type="button" className="popup-varian-remove" onClick={() => setLevelList(list => list.filter((_, i) => i !== idx))}>✖</button>
                          </div>
                        ))}
                        <div className="popup-varian-input-row">
                          <input
                            type="text"
                            className="popup-input"
                            placeholder="Level"
                            value={levelInput}
                            onChange={e => setLevelInput(e.target.value)}
                          />
                          <button type="button" className="popup-varian-add" onClick={() => {
                            if (levelInput.trim()) {
                              setLevelList(list => [...list, levelInput.trim()]);
                              setLevelInput('');
                            }
                          }}>+ Tambah Level</button>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>
              <div className="popup-menu-footer">
                <button type="button" className="popup-save-btn" onClick={handleEditSubmit}>
                  <span role="img" aria-label="save" style={{marginRight: '8px'}}>💾</span>
                  <span style={{fontWeight:'bold'}}>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Menu Popup */}
        {showDeleteIdx !== null && (
          <div className="popup-overlay">
            <div className="popup-menu" style={{textAlign:'center'}}>
              <div className="popup-header" style={{justifyContent:'center', position:'relative'}}>
                <div className="popup-delete-title">Hapus Menu?</div>
                <span className="popup-close" onClick={closeDeletePopup} style={{position:'absolute', right:12, top:8}}>✕</span>
              </div>
              <span className="popup-delete-icon">🗑️</span>
              <div className="popup-delete-name">{menus[showDeleteIdx]?.nama}</div>
              <div className="popup-delete-warning">Menu yang dihapus tidak dapat dikembalikan!</div>
              <div className="popup-delete-actions">
                <button className="btn-batal" onClick={closeDeletePopup}>✖ Batal</button>
                <button className="btn-hapus-confirm" onClick={handleDelete}>🗑️ Ya, Hapus</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default TambahMenu;

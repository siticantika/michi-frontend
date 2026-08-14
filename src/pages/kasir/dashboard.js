import React, { useState, useEffect } from 'react';
// import context dihapus, fetch langsung ke backend
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import '../../styles/dashboard.css';

// Ambil menu dari context

function Dashboard() {
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [activeType, setActiveType] = useState('makanan');
  const [jenisHarga, setJenisHarga] = useState('outlet');
  const [search, setSearch] = useState('');
  const [popupMenu, setPopupMenu] = useState(null);
  const [selectedVarian, setSelectedVarian] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [qrisFile, setQrisFile] = useState(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // Saat halaman kasir dibuka, sistem mengambil daftar menu dari backend.
  // Menu ini kemudian ditampilkan ke layar agar kasir bisa memilih pesanan.
  useEffect(() => {
    fetch(`${API}/tes-menu`)
      .then(res => res.json())
      .then(data => {
        setMenus(data.map(menu => {
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
        }));
      })
      .catch(() => setMenus([]));
  }, []);

  const openPopup = menu => {
    setPopupMenu({
      ...menu,
      varian: Array.isArray(menu.varian) ? menu.varian : (menu.varian ? [menu.varian] : []),
      level: Array.isArray(menu.level) ? menu.level : (menu.level ? [menu.level] : []),
    });
    setQty(1);
    setSelectedVarian(Array.isArray(menu.varian) ? menu.varian[0] : (menu.varian ? menu.varian : ''));
    setSelectedLevel(Array.isArray(menu.level) ? menu.level[0] : (menu.level ? menu.level : ''));
  };
  const closePopup = () => {
    setPopupMenu(null);
  };

  // Saat kasir memilih menu, item dimasukkan ke keranjang.
  // Keranjang ini berfungsi seperti daftar pesanan sementara sebelum checkout.
  const handleAddToCart = e => {
    e.preventDefault();
    if (!popupMenu) return;

    const popupHarga =
      jenisHarga === 'outlet'
        ? Number(popupMenu.harga_outlet ?? popupMenu.price ?? 0)
        : Number(popupMenu.harga_grab ?? popupMenu.price ?? 0);

    const cartItem = {
      id: Date.now(),
      // include original menu id so checkout sends correct menu_id
      menu_id: popupMenu.id || popupMenu.menu_id || null,
      title: popupMenu.title || popupMenu.nama,
      img: popupMenu.img || null,
      price: popupHarga,
      jenis_harga: jenisHarga === 'outlet' ? 'outlet' : 'grab',
      qty,
      // always take selected values (may be empty string -> null)
      varian: selectedVarian || null,
      level: selectedLevel || null,
      emoji: popupMenu.emoji,
    };
    setCart([...cart, cartItem]);
    closePopup();
  };

  const handleRemoveCart = id => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Bagian ini adalah perhitungan subtotal dari keranjang.
  // Setiap item dihitung dari harga dikali jumlah, lalu semua hasil dijumlahkan.
  // Nilai ini menjadi dasar total yang akan dikirim ke backend saat checkout.
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Handler untuk upload bukti Qris
  const handleQrisProofChange = e => {
    setQrisFile(e.target.files[0]); // FILE ASLI
  };

  // Handler untuk Bayar Sekarang
// Ketika kasir menekan tombol bayar, data keranjang dikirim ke backend.
// Backend lalu menyimpan pesanan sebagai transaksi dan detail transaksi.
const handlePayNow = async (e) => {
  e.preventDefault();

  try {
    const token = localStorage.getItem('token');
    const formData = new FormData();

    // Bagian ini mengirim data checkout ke backend.
    // Setelah tombol bayar dipencet, data pesanan dikirim dan disimpan sebagai transaksi.
    // Nilai subtotal dari frontend dikirim sebagai total transaksi.
    formData.append("kasir_id", 1);
    formData.append("total", subtotal);
    formData.append("metode", paymentMethod);
    formData.append("jenis_harga", jenisHarga);

    formData.append(
      "items",
      JSON.stringify(
        cart.map(item => ({
          menu_id: item.menu_id || item.id,
          nama_menu: item.title,
          harga: item.price,
          jumlah: item.qty,
          varian: item.varian || null,
          level: item.level || null,
          jenis_harga: item.jenis_harga || null
        }))
      )
    );

    if (paymentMethod === "qris") {
      formData.append("bukti_qris", qrisFile); // FILE ASLI
    }

    // Saat kasir menekan bayar, frontend mengirim data pesanan ke endpoint /transaksi di backend.
    // Backend lalu menyimpan data ke tabel transaksi dan transaksi_detail.
    const res = await fetch(`${API}/transaksi`, {
      method: "POST",
      headers: {
        // Tambahkan Authorization header agar log aktivitas bisa mencatat
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(text);
      throw new Error("Checkout gagal");
    }

    // show in-app success modal instead of native alert
    // hide the checkout popup and show the success modal
    setShowCheckout(false);
    setCheckoutSuccess(true);
    // clear cart and other local state
    setCart([]);

  } catch (err) {
    alert(err.message || "Checkout gagal");
  }
};

  // shrink checkout popup when many items to keep layout consistent
  const checkoutShrink = cart.length > 6;



  return (
    <div className="dashboard-container">
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
        <button
          className="nav-toggle"
          aria-label="Toggle navigation"
          onClick={() => setNavOpen(o => !o)}
          type="button"
          style={{ marginLeft: 8 }}
        >
          ☰
        </button>
        <Navbar open={navOpen} setOpen={setNavOpen} />
        {navOpen && (
          <div className="nav-backdrop" onClick={() => setNavOpen(false)} />
        )}
      </header>
      <main className="dashboard-main">
        <section className="menu-section">
          <div className="menu-type-filter-bar">
            <div className="menu-price-filter">
              <select
                className="menu-price-filter-select"
                value={jenisHarga}
                onChange={e => setJenisHarga(e.target.value)}
                aria-label="Jenis Harga"
              >
                <option value="outlet">Outlet</option>
                <option value="grabfood">GrabFood</option>
              </select>
            </div>
            <div className="menu-type-btns">
              <button className={activeType === 'makanan' ? 'active' : ''} onClick={() => setActiveType('makanan')}>Makanan</button>
              <button className={activeType === 'minuman' ? 'active' : ''} onClick={() => setActiveType('minuman')}>Minuman</button>
            </div>
          </div>
          <div className="menu-cards">
            {menus
              .map((menu, idx) => ({ ...menu }))
              .filter(m => {
                // filter by active type
                const kategori = m.kategori ? m.kategori.toLowerCase() : '';
                const categoryMatch = !kategori || kategori === activeType;
                // filter by search term (nama or deskripsi)
                const q = (search || '').trim().toLowerCase();
                const name = (m.nama || '').toString().toLowerCase();
                const desc = (m.deskripsi || '').toString().toLowerCase();
                const searchMatch = q === '' || name.includes(q) || desc.includes(q);
                return categoryMatch && searchMatch;
              })
              .map(menu => {
                const harga =
                  jenisHarga === 'outlet'
                    ? Number(menu.harga_outlet)
                    : Number(menu.harga_grab);

                return (
                  <div className="menu-card" key={menu.id} style={{position:'relative'}}>
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
                    <div className="menu-card-desc">{menu.deskripsi}</div>
                    <div className="menu-card-price">Rp {harga.toLocaleString('id-ID')}</div>
                    <button className="menu-card-add" onClick={() => openPopup(menu)}>+ Pilih</button>
                  </div>
                );
              })}
          </div>
        </section>
        <aside className="cart-section">
          <div className="cart-header"> 🛒 Keranjang Pesanan </div>
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-title">Keranjang Masih Kosong</div>
              <div className="cart-empty-desc">Pilih Menu Untuk Menambahkan Pesanan</div>
            </div>
          ) : (
            <div className="cart-list">
              {cart.map(item => (
                <div className="cart-item" key={item.id}>
                  <button className="cart-item-remove" onClick={() => handleRemoveCart(item.id)}>🗑</button>
                <div className="cart-item-top">
                  <div className="cart-item-title">{item.title}</div>
                </div>
                  <div className="cart-item-varian">Harga : {item.jenis_harga === 'outlet' ? 'Outlet' : 'GrabFood'}</div>
                  {item.varian && <div className="cart-item-varian">Varian: {item.varian}</div>}
                  {item.level && <div className="cart-item-varian">Level: {item.level}</div>}
                  <div className="cart-item-divider" />
                  <div className="cart-item-bottom">
                    <div className="cart-item-qty">Jumlah: {item.qty}x</div>
                    <div className="cart-item-price">Rp {typeof item.price === 'number' && !isNaN(item.price) ? item.price.toLocaleString() : '-'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="cart-checkout">
            <div className="cart-subtotal">
              <span>Subtotal</span>
              <span>Rp {subtotal.toLocaleString()}</span>
            </div>
            <div className="cart-total">
              <span>TOTAL</span>
              <span>Rp {subtotal.toLocaleString()}</span>
            </div>
            {/* Tombol Checkout trigger pop up */}
            <button className="cart-checkout-btn" onClick={() => setShowCheckout(true)}>Checkout</button>
                {/* Pop up Checkout (jangan tampilkan ketika success modal aktif) */}
                {showCheckout && !checkoutSuccess && (
                  <div className="checkout-overlay">
                    <div className={`checkout-popup ${checkoutShrink ? 'shrink' : ''}`}>
                      <div className="checkout-header">
                        <span>Checkout</span>
                        <span className="checkout-close" onClick={() => setShowCheckout(false)}>X</span>
                      </div>
                      <div className="checkout-body">
                        <div className="checkout-title-ringkasan">Ringkasan Pesanan</div>
                        <div className="checkout-list">
                          {cart.map((item, idx) => (
                            <div key={idx} className="checkout-item">
                              <div className="checkout-item-title">{item.title} x{item.qty}</div>
                              {item.varian && <div className="checkout-item-varian">- {item.varian}</div>}
                              {item.level && <div className="checkout-item-varian">- {item.level}</div>}
                              <div className="checkout-item-price">Rp {item.price.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                        <div className="checkout-total-row">
                          <span className="checkout-total-label">Total:</span>
                          <span className="checkout-total-value">Rp {subtotal.toLocaleString()}</span>
                        </div>
                        <div className="checkout-method-label">Pilih Metode Pembayaran</div>
                        <div className="checkout-method-row">
                          <label className={`checkout-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('cash')}>
                            <span className="checkout-radio">
                              <span className={paymentMethod === 'cash' ? 'radio-checked' : 'radio-unchecked'}></span>
                            </span>
                            <span className="checkout-method-text">Cash</span>
                          </label>
                          <label className={`checkout-method-btn ${paymentMethod === 'qris' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('qris')}>
                            <span className="checkout-radio">
                              <span className={paymentMethod === 'qris' ? 'radio-checked' : 'radio-unchecked'}></span>
                            </span>
                            <span className="checkout-method-text">Qris</span>
                          </label>
                        </div>
                        {paymentMethod === 'qris' && (
                          <div className="checkout-qris-proof">
                            <div className="checkout-qris-label">Upload Bukti Pembayaran Qris:</div>
                            <label className="checkout-qris-upload">
                              <input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handleQrisProofChange} />
                              <div className="checkout-qris-upload-box" onClick={e => e.currentTarget.previousSibling.click()}>
                                {qrisFile ? (
                                  <img
                                    src={URL.createObjectURL(qrisFile)}
                                    alt="Bukti Qris"
                                    className="checkout-qris-img"
                                  />
                                ) : (
                                  <>
                                    <span className="checkout-qris-icon">📷</span>
                                    <span className="checkout-qris-upload-text">Klik untuk upload bukti pembayaran</span>
                                  </>
                                )}
                              </div>
                            </label>
                          </div>
                        )}
                        <button className="checkout-pay-btn" onClick={handlePayNow}>Bayar Sekarang</button>
                      </div>
                    </div>
                  </div>
                )}
          </div>
        </aside>
      </main>
      {/* Success modal ditampilkan terpisah, hanya jika checkoutSuccess true */}
      {checkoutSuccess && (
        <div className="checkout-overlay" role="dialog" aria-modal="true">
          <div className="popup-menu-wrapper" style={{position:'relative'}}>
            <div className="popup-avatar" style={{top: -40, left: '50%', transform: 'translateX(-50%)', width:64, height:64}}>
              <img src="/logimichi.jpg" alt="logo" />
            </div>
            <div style={{paddingTop:36, paddingBottom:20, textAlign:'center'}}>
              <h3 style={{margin:0, color:'#5d4037', fontFamily: 'Luckiest Guy, cursive'}}>Checkout Berhasil</h3>
              <p style={{marginTop:8, color:'#774747'}}>Pesanan Telah Diterima.</p>
              <div style={{marginTop:14}}>
                <button className="popup-save-btn-oke" onClick={() => { setCheckoutSuccess(false); navigate('/kasir/transaksi'); }}>
                  Oke
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {popupMenu && (
        <div className="popup-overlay">
          <div className="popup-menu">
            <div className="popup-header">
              <span className="popup-title">{popupMenu.title || popupMenu.nama}</span>
              <span className="popup-close" onClick={closePopup}>X</span>
            </div>
            <form className="popup-form" onSubmit={handleAddToCart}>
              {Array.isArray(popupMenu.varian) && popupMenu.varian.length > 0 && (
                <>
                  <label className="popup-label">Pilih Varian</label>
                  <select className="popup-select" value={selectedVarian} onChange={e => setSelectedVarian(e.target.value)}>
                    {popupMenu.varian.map((v, idx) => (
                      <option key={idx} value={v}>{v}</option>
                    ))}
                  </select>
                </>
              )}
              {Array.isArray(popupMenu.level) && popupMenu.level.length > 0 && (
                <>
                  <label className="popup-label">Pilih Level</label>
                  <select className="popup-select" value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}>
                    {popupMenu.level.map((l, idx) => (
                      <option key={idx} value={l}>{l}</option>
                    ))}
                  </select>
                </>
              )}
              <label className="popup-label">Jumlah:</label>
              <div className="popup-qty-row">
                <button type="button" className="popup-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>-</button>
                <span className="popup-qty-value">{qty}</span>
                <button type="button" className="popup-qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
              </div>
              <button type="submit" className="popup-save-btn" style={{marginTop: '32px'}}>
                Tambah Ke Keranjang
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

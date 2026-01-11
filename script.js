// ============================================
// KONFIGURASI APLIKASI - UBAH BAGIAN INI
// ============================================
const CONFIG = {
    // 1. GANTI dengan URL Google Sheets Anda
    // Cara dapatkan: File → Share → Publish to web → Pilih CSV → Copy link
    GOOGLE_SHEETS_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYGiCijVDnA_aR-Jq33Dt__NnkZa8kdB9PuG3nqkkCtXGxuFw5rNT6sKpjYeqSxBdGZXJGr6nUJLfI/pub?gid=0&single=true&output=csv",
    
    // 2. GANTI dengan nomor WhatsApp admin (format: 6281234567890)
    ADMIN_WHATSAPP: "6285121251820",
    
    // 3. GANTI dengan nama toko Anda
    STORE_NAME: "Ladang VApe",
    
    // 4. Opsional: Ganti dengan username Telegram admin
    ADMIN_TELEGRAM: "@old_wine19xx"
};

// ============================================
// VARIABEL GLOBAL
// ============================================
let allProducts = [];        // Semua produk dari Google Sheets
let cart = [];              // Keranjang belanja
let currentCategory = 'all'; // Kategori aktif
let tg = null;              // Telegram Web App instance

// ============================================
// INISIALISASI APLIKASI
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Aplikasi Vape Store dimulai...');
    
    // Inisialisasi Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.expand();
        tg.enableClosingConfirmation();
        tg.MainButton.setText("🛒 Buka Keranjang");
        tg.MainButton.onClick(showCart);
        tg.MainButton.show();
        console.log('Telegram Web App aktif');
    }
    
    // Load produk dari Google Sheets
    await loadProductsFromGoogleSheets();
    
    // Update tampilan awal
    updateCartDisplay();
    
    // Sembunyikan loading screen
    setTimeout(() => {
        document.getElementById('loadingScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 300);
    }, 500);
    
    console.log('✅ Aplikasi siap digunakan');
});

// ============================================
// FUNGSI LOAD PRODUK DARI GOOGLE SHEETS
// ============================================
async function loadProductsFromGoogleSheets() {
    try {
        console.log('📥 Memuat produk dari Google Sheets...');
        
        // Fetch data dari Google Sheets
        const response = await fetch(CONFIG.GOOGLE_SHEETS_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvData = await response.text();
        console.log('📊 Data CSV diterima:', csvData.length, 'karakter');
        
        // Parse CSV ke array produk
        allProducts = parseCSV(csvData);
        
        console.log(`✅ ${allProducts.length} produk berhasil dimuat`);
        
        // Tampilkan produk
        renderProducts('all');
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        
        // Fallback: Gunakan data contoh jika gagal load
        allProducts = getSampleProducts();
        renderProducts('all');
        
        alert('⚠️ Gagal memuat data dari Google Sheets. Menggunakan data contoh.');
    }
}

// ============================================
// FUNGSI PARSE CSV (GOOGLE SHEETS TO ARRAY)
// ============================================
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
        console.warn('⚠️ CSV kosong atau hanya header');
        return [];
    }
    
    // Ambil header (baris pertama)
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log('📋 Header terdeteksi:', headers);
    
    // Mapping header ke field yang diharapkan
    const fieldMapping = {
        'nama': 'name',
        'harga': 'price',
        'kategori': 'category',
        'deskripsi': 'desc',
        'stok': 'stock',
        'gambar': 'image'
    };
    
    const products = [];
    
    // Proses setiap baris data (dimulai dari baris 2)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Split dengan memperhatikan koma di dalam quotes
        const values = parseCSVLine(line);
        
        const product = {
            id: i, // ID otomatis
            name: '',
            price: 0,
            category: 'liquid',
            desc: '',
            stock: 10,
            image: ''
        };
        
        // Map values ke product berdasarkan header
        headers.forEach((header, index) => {
            const value = values[index] || '';
            const fieldName = fieldMapping[header];
            
            if (fieldName) {
                if (fieldName === 'price') {
                    product[fieldName] = parseFloat(value.replace(/[^0-9]/g, '')) || 0;
                } else if (fieldName === 'stock') {
                    product[fieldName] = parseInt(value) || 0;
                } else {
                    product[fieldName] = value.trim();
                }
            }
        });
        
        // Validasi produk minimal
        if (product.name && product.price > 0) {
            // Standardisasi kategori
            if (product.category) {
                const cat = product.category.toLowerCase();
                if (cat.includes('liquid') || cat.includes('cairan')) product.category = 'liquid';
                else if (cat.includes('device') || cat.includes('mod')) product.category = 'device';
                else if (cat.includes('pod') || cat.includes('disposable')) product.category = 'pod';
                else if (cat.includes('coil') || cat.includes('head')) product.category = 'coil';
                else if (cat.includes('aksesoris') || cat.includes('accessory')) product.category = 'aksesoris';
            }
            
            products.push(product);
        }
    }
    
    return products;
}

// Helper function untuk parse CSV line
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current);
    return values;
}

// ============================================
// DATA CONTOH (FALLBACK JIKA SHEETS GAGAL)
// ============================================
function getSampleProducts() {
    return [
        {
            id: 1,
            name: "Liquid Saltnic Mango 30ml",
            price: 85000,
            category: "liquid",
            desc: "Rasa mangga manis, nikotin 30mg",
            stock: 15
        },
        {
            id: 2,
            name: "Liquid Freebase Vanilla 60ml",
            price: 120000,
            category: "liquid",
            desc: "Rasa vanilla cream, nikotin 3mg",
            stock: 8
        },
        {
            id: 3,
            name: "Vaporesso XROS 3 Pod Kit",
            price: 350000,
            category: "device",
            desc: "Pod system, USB-C, adjustable airflow",
            stock: 5
        },
        {
            id: 4,
            name: "Geekvape Aegis Solo 2",
            price: 650000,
            category: "device",
            desc: "Waterproof, shockproof, single 18650 battery",
            stock: 3
        },
        {
            id: 5,
            name: "Elf Bar BC5000 Disposable",
            price: 250000,
            category: "pod",
            desc: "Disposable pod 5000 puffs, berbagai rasa",
            stock: 20
        },
        {
            id: 6,
            name: "Coil Vaporesso GTX 0.8ohm",
            price: 45000,
            category: "coil",
            desc: "Paket 3 coil, untuk GTX series",
            stock: 25
        }
    ];
}

// ============================================
// FUNGSI RENDER PRODUK KE TAMPILAN
// ============================================
function renderProducts(category = 'all') {
    currentCategory = category;
    const container = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!allProducts || allProducts.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    // Filter produk berdasarkan kategori
    let filteredProducts = allProducts;
    if (category !== 'all') {
        filteredProducts = allProducts.filter(p => p.category === category);
    }
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '';
        emptyState.innerHTML = `
            <i class="fas fa-search"></i>
            <h3>Tidak ada produk</h3>
            <p>Tidak ditemukan produk dalam kategori "${category}"</p>
        `;
        emptyState.style.display = 'block';
        return;
    }
    
    // Generate HTML untuk setiap produk
    container.innerHTML = filteredProducts.map(product => {
        const cartItem = cart.find(item => item.id === product.id);
        const quantity = cartItem ? cartItem.quantity : 0;
        const stockText = product.stock > 0 ? 
            `<span class="product-stock"><i class="fas fa-check-circle"></i> Stok: ${product.stock}</span>` :
            `<span class="product-stock" style="color: var(--danger);"><i class="fas fa-times-circle"></i> Habis</span>`;
        
        return `
        <div class="product-card" data-category="${product.category}">
            <div class="product-image">
                <i class="fas fa-smoking"></i>
                ${product.stock < 5 && product.stock > 0 ? '<span class="product-badge">Hampir Habis</span>' : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-category">
                    <i class="fas fa-tag"></i> ${product.category.toUpperCase()}
                </div>
                <div class="product-price">${formatPrice(product.price)}</div>
                ${stockText}
                <div class="product-actions">
                    <div class="qty-control">
                        <button class="qty-btn" onclick="updateQuantity(${product.id}, -1)" 
                            ${quantity === 0 ? 'disabled' : ''}>-</button>
                        <span class="qty-display">${quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${product.id}, 1)"
                            ${product.stock === 0 || quantity >= product.stock ? 'disabled' : ''}>+</button>
                    </div>
                    <button class="add-btn ${quantity > 0 ? 'added' : ''}" 
                        onclick="updateQuantity(${product.id}, 1)"
                        ${product.stock === 0 ? 'disabled style="background: var(--gray);"' : ''}>
                        <i class="fas fa-${quantity > 0 ? 'check' : 'cart-plus'}"></i>
                        ${quantity > 0 ? 'Ditambahkan' : 'Tambah'}
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    emptyState.style.display = 'none';
}

// ============================================
// FUNGSI FILTER PRODUK BERDASARKAN KATEGORI
// ============================================
function filterProducts(category) {
    // Update tombol kategori aktif
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Tandai tombol kategori yang aktif
    const activeBtn = Array.from(document.querySelectorAll('.category-btn'))
        .find(btn => {
            const btnCategory = btn.getAttribute('onclick')?.includes(`'${category}'`) ? category : 
                               btn.textContent.includes('Semua') ? 'all' : '';
            return btnCategory === category;
        });
    
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Render produk dengan filter
    renderProducts(category);
}

// ============================================
// FUNGSI KERANJANG BELANJA
// ============================================
function updateQuantity(productId, change) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const index = cart.findIndex(item => item.id === productId);
    
    if (index > -1) {
        // Produk sudah ada di keranjang
        const newQuantity = cart[index].quantity + change;
        
        if (newQuantity <= 0) {
            // Hapus dari keranjang jika quantity 0
            cart.splice(index, 1);
        } else if (newQuantity > product.stock) {
            // Tidak boleh melebihi stok
            alert(`❌ Stok ${product.name} hanya tersedia ${product.stock} pcs`);
            return;
        } else {
            // Update quantity
            cart[index].quantity = newQuantity;
        }
    } else if (change > 0) {
        // Tambah produk baru ke keranjang
        if (product.stock === 0) {
            alert(`❌ Maaf, ${product.name} sedang habis`);
            return;
        }
        
        if (product.stock < change) {
            alert(`❌ Stok ${product.name} hanya tersedia ${product.stock} pcs`);
            return;
        }
        
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    // Update tampilan
    updateCartDisplay();
    renderProducts(currentCategory);
    
    // Feedback visual
    if (change > 0) {
        showNotification(`✅ ${product.name} ditambahkan ke keranjang`);
    }
}

function updateCartDisplay() {
    // Update jumlah item di icon keranjang
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = totalItems;
    
    // Update tampilan Telegram MainButton
    if (tg) {
        tg.MainButton.setText(totalItems > 0 ? `🛒 Keranjang (${totalItems})` : "🛒 Buka Keranjang");
    }
    
    // Update daftar item di sidebar keranjang
    const cartItemsContainer = document.getElementById('cartItems');
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-basket"></i>
                <p>Keranjang belanja kosong</p>
            </div>
        `;
    } else {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${formatPrice(item.price)} × ${item.quantity}</p>
                </div>
                <div class="cart-item-controls">
                    <button class="cart-item-btn remove-btn" onclick="updateQuantity(${item.id}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span style="font-weight: bold; min-width: 30px; text-align: center;">${item.quantity}</span>
                    <button class="cart-item-btn" onclick="updateQuantity(${item.id}, 1)" 
                        ${item.quantity >= item.stock ? 'disabled style="opacity: 0.5;"' : ''}>
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Update harga total
    document.getElementById('subtotalPrice').textContent = formatPrice(subtotal);
    document.getElementById('totalPrice').textContent = formatPrice(subtotal);
}

// ============================================
// FUNGSI KERANJANG SIDEBAR
// ============================================
function showCart() {
    document.getElementById('cartSidebar').classList.add('active');
    document.getElementById('overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideCart() {
    document.getElementById('cartSidebar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ============================================
// FUNGSI CHECKOUT & ORDER
// ============================================
function openCheckoutForm() {
    if (cart.length === 0) {
        showNotification('❌ Keranjang belanja kosong');
        return;
    }
    
    // Generate order summary
    const orderSummary = document.getElementById('orderSummary');
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    let summaryHTML = '';
    cart.forEach(item => {
        summaryHTML += `
            <div class="order-item">
                <span>${item.name} (${item.quantity}×)</span>
                <span>${formatPrice(item.price * item.quantity)}</span>
            </div>
        `;
    });
    
    summaryHTML += `
        <div class="order-item" style="border-top: 2px solid var(--primary); padding-top: 10px; margin-top: 10px;">
            <span><strong>Total</strong></span>
            <span><strong>${formatPrice(subtotal)}</strong></span>
        </div>
    `;
    
    orderSummary.innerHTML = summaryHTML;
    
    // Reset form
    document.getElementById('checkoutForm').reset();
    
    // Tampilkan modal
    document.getElementById('checkoutModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCheckoutForm() {
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function processCheckout() {
    // Validasi form
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const payment = document.getElementById('paymentMethod').value;
    const notes = document.getElementById('customerNotes').value.trim();
    
    if (!name || !phone || !address || !payment) {
        showNotification('❌ Harap isi semua field yang wajib diisi');
        return;
    }
    
    if (!/^[0-9+]{10,15}$/.test(phone.replace(/\s/g, ''))) {
        showNotification('❌ Nomor WhatsApp tidak valid');
        return;
    }
    
    // Generate order ID
    const orderId = 'ORD' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
    const orderDate = new Date().toLocaleString('id-ID');
    
    // Format pesan untuk WhatsApp
    let whatsappMessage = `*${CONFIG.STORE_NAME}*%0A`;
    whatsappMessage += `*ORDER ID:* ${orderId}%0A`;
    whatsappMessage += `*Tanggal:* ${orderDate}%0A%0A`;
    
    whatsappMessage += `*DATA PELANGGAN:*%0A`;
    whatsappMessage += `Nama: ${name}%0A`;
    whatsappMessage += `WhatsApp: ${phone}%0A`;
    whatsappMessage += `Alamat: ${address}%0A`;
    whatsappMessage += `Metode Bayar: ${payment}%0A`;
    
    if (notes) {
        whatsappMessage += `Catatan: ${notes}%0A`;
    }
    
    whatsappMessage += `%0A*DETAIL ORDER:*%0A`;
    
    let total = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        whatsappMessage += `${index + 1}. ${item.name}%0A`;
        whatsappMessage += `   ${item.quantity} × ${formatPrice(item.price)} = ${formatPrice(itemTotal)}%0A`;
    });
    
    whatsappMessage += `%0A*TOTAL: ${formatPrice(total)}*%0A%0A`;
    whatsappMessage += `_Pesanan ini dibuat via Telegram Mini App_`;
    
    // Encode pesan untuk URL WhatsApp
    const encodedMessage = encodeURIComponent(whatsappMessage);
    
    // Format nomor telepon (hilangkan + atau 0 di depan)
    let cleanPhone = phone.replace(/^\+/, '').replace(/^0/, '62');
    if (!cleanPhone.startsWith('62')) {
        cleanPhone = '62' + cleanPhone;
    }
    
    // Buat URL WhatsApp
    const whatsappURL = `https://wa.me/${CONFIG.ADMIN_WHATSAPP || cleanPhone}?text=${encodedMessage}`;
    
    // Simpan order ke localStorage (simpan sementara)
    saveOrderToLocalStorage({
        orderId,
        date: orderDate,
        customer: { name, phone, address },
        payment,
        notes,
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
        })),
        total,
        status: 'pending'
    });
    
    // Buka WhatsApp
    window.open(whatsappURL, '_blank');
    
    // Reset keranjang
    cart = [];
    updateCartDisplay();
    renderProducts(currentCategory);
    
    // Tutup modal
    closeCheckoutForm();
    hideCart();
    
    // Tampilkan konfirmasi
    showNotification('✅ Order berhasil! Admin akan menghubungi Anda via WhatsApp.');
}

// ============================================
// FUNGSI BANTUAN (HELPER FUNCTIONS)
// ============================================
function formatPrice(price) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(price);
}

function showNotification(message) {
    // Buat element notifikasi
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--dark);
        color: white;
        padding: 15px 20px;
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        z-index: 9999;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        max-width: 300px;
        font-weight: 500;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animasi masuk
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Animasi keluar setelah 3 detik
    setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function saveOrderToLocalStorage(orderData) {
    try {
        // Ambil order yang sudah ada
        const existingOrders = JSON.parse(localStorage.getItem('vapeStoreOrders') || '[]');
        
        // Tambah order baru
        existingOrders.unshift(orderData);
        
        // Simpan maksimal 50 order terakhir
        const trimmedOrders = existingOrders.slice(0, 50);
        
        // Simpan ke localStorage
        localStorage.setItem('vapeStoreOrders', JSON.stringify(trimmedOrders));
        
        console.log('✅ Order disimpan ke localStorage:', orderData.orderId);
    } catch (error) {
        console.error('❌ Gagal menyimpan order ke localStorage:', error);
    }
}

// ============================================
// EXPOSED FUNCTIONS (untuk onclick di HTML)
// ============================================
window.filterProducts = filterProducts;
window.updateQuantity = updateQuantity;
window.showCart = showCart;
window.hideCart = hideCart;
window.openCheckoutForm = openCheckoutForm;
window.closeCheckoutForm = closeCheckoutForm;
window.processCheckout = processCheckout;
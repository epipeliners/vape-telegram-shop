// ============================================
// KONFIGURASI APLIKASI - UBAH BAGIAN INI
// ============================================
const CONFIG = {
    GOOGLE_SHEETS_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYGiCijVDnA_aR-Jq33Dt__NnkZa8kdB9PuG3nqkkCtXGxuFw5rNT6sKpjYeqSxBdGZXJGr6nUJLfI/pub?gid=0&single=true&output=csv",
    
    // GANTI INI dengan nomor admin YANG BENAR
    ADMIN_WHATSAPP: "6285121251820", // Format: 62XXXXXXXXXX
    
    STORE_NAME: "Ladang VApe",
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
	document.addEventListener('DOMContentLoaded', initApp);
	async function() {
	console.log('🚀 Aplikasi Ladang VApe dimulai...');
    
	function initApp() {
	console.log('🚀 Inisialisasi app...');

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
    
    // 2. Load produk di background (non-blocking)
    setTimeout(() => {
        loadProductsFromGoogleSheets();
    }, 100);	

    // Sembunyikan loading screen
    setTimeout(() => {
        document.getElementById('loadingScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 300);
    }, 2000);
    
    console.log('✅ Aplikasi siap digunakan');
});

// ============================================
// FUNGSI LOAD PRODUK DARI GOOGLE SHEETS
// ============================================
async function loadProductsFromGoogleSheets() {
    showLoading(true);
    console.log('⏳ Memulai load produk...');
    
    try {
        // SET TIMEOUT (max 10 detik)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: Gagal load produk setelah 10 detik')), 10000);
        });
        
        // Fetch data dengan timeout
        const fetchPromise = fetch(CONFIG.GOOGLE_SHEETS_URL);
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvData = await response.text();
        console.log('✅ Data diterima:', csvData.length, 'karakter');
        
        // Parse data
        allProducts = parseCSV(csvData);
        
        if (allProducts.length === 0) {
            console.warn('⚠️ Tidak ada produk ditemukan, menggunakan data sample');
            allProducts = getSampleProducts();
        }
        
        console.log(`✅ ${allProducts.length} produk berhasil dimuat`);
        renderProducts('all');
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        
        // FALLBACK: Gunakan data sample
        allProducts = getSampleProducts();
        renderProducts('all');
        
        // Tampilkan pesan user-friendly
        if (error.message.includes('Timeout')) {
            showNotification('⚠️ Koneksi lambat, menggunakan data lokal');
        } else if (error.message.includes('CORS')) {
            showNotification('⚠️ Akses ke Google Sheets terblokir');
        }
    } finally {
        showLoading(false);
        console.log('🏁 Load produk selesai');
    }
}

// ============================================
// FUNGSI PARSE CSV (GOOGLE SHEETS TO ARRAY)
// ============================================
function parseCSV(csvText) {
    console.time('parseCSV'); // Timer
    
    try {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            console.warn('CSV kosong');
            return [];
        }
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        console.log('Header ditemukan:', headers);
        
        const products = [];
        
        // Proses maksimal 100 baris (untuk performa)
        const maxRows = Math.min(lines.length, 101); // 100 produk max
        
        for (let i = 1; i < maxRows; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',');
            const product = {
                id: i,
                name: '',
                price: 0,
                category: 'liquid',
                desc: '',
                stock: 10,
                image: ''
            };
            
            // Mapping sederhana
            headers.forEach((header, index) => {
                const value = values[index] ? values[index].trim() : '';
                
                if (header.includes('nama')) product.name = value;
                else if (header.includes('harga')) product.price = parseInt(value) || 0;
                else if (header.includes('kategori')) product.category = value.toLowerCase();
                else if (header.includes('deskripsi')) product.desc = value;
                else if (header.includes('stok')) product.stock = parseInt(value) || 0;
                else if (header.includes('gambar')) product.image = value;
            });
            
            // Hanya tambah jika valid
            if (product.name && product.price > 0) {
                products.push(product);
            }
        }
        
        console.timeEnd('parseCSV'); // Stop timer
        console.log(`Parsed ${products.length} produk`);
        return products;
        
    } catch (error) {
        console.error('Error parsing CSV:', error);
        return [];
    }
}        
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
        
        // Tentukan gambar atau icon
        const productImage = product.image && product.image.trim() !== '' ? 
            `<img src="${product.image}" alt="${product.name}" class="product-img" 
                 onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-smoking\\'></i>';">` :
            `<i class="fas fa-smoking"></i>`;
        
        return `
        <div class="product-card" data-category="${product.category}">
            <div class="product-image">
                ${productImage}
                ${product.stock < 5 && product.stock > 0 ? '<span class="product-badge">Hampir Habis</span>' : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-category">
                    <i class="fas fa-tag"></i> ${product.category ? product.category.toUpperCase() : 'LIQUID'}
                </div>
                <div class="product-price">${formatPrice(product.price)}</div>
                ${stockText}
                // GANTI DENGAN INI:
${product.stock > 0 ? `
    <div class="product-stock-simple ${product.stock < 5 ? 'low-stock' : 'in-stock'}">
        <i class="fas ${product.stock < 5 ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
        Stok: ${product.stock}
    </div>
` : `
    <div class="product-stock-simple out-of-stock">
        <i class="fas fa-times-circle"></i>
        Habis
    </div>
`}

<!-- TOMBOL +/- SEDERHANA -->
<div class="product-actions-simple">
    <button class="qty-btn-simple" onclick="updateQuantity(${product.id}, -1)" 
        ${quantity === 0 ? 'disabled' : ''}>
        -
    </button>
    
    <span class="qty-display-simple">
        ${quantity}
    </span>
    
    <button class="qty-btn-plus-simple" onclick="updateQuantity(${product.id}, 1)"
        ${product.stock === 0 || quantity >= product.stock ? 'disabled' : ''}>
        +
    </button>
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
    
    // Validasi nomor telepon
    const cleanPhone = phone.replace(/\D/g, ''); // Hapus semua non-digit
    let formattedPhone = '';
    
    if (cleanPhone.startsWith('0')) {
        formattedPhone = '62' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('62')) {
        formattedPhone = cleanPhone;
    } else if (cleanPhone.startsWith('8')) {
        formattedPhone = '62' + cleanPhone;
    } else {
        showNotification('❌ Format nomor WhatsApp tidak valid');
        return;
    }
    
    // Validasi panjang nomor
    if (formattedPhone.length < 10 || formattedPhone.length > 15) {
        showNotification('❌ Nomor WhatsApp harus 10-15 digit');
        return;
    }
    
    // Generate order ID
    const orderId = 'ORD' + Date.now().toString().slice(-8);
    const orderDate = new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Format pesan untuk WhatsApp (SIMPLE VERSION)
    let whatsappMessage = `*Ladang Vape*\n`;
    whatsappMessage += `*ORDER ID:* ${orderId}\n`;
    whatsappMessage += `*Tanggal:* ${orderDate}\n\n`;
    
    whatsappMessage += `*DATA PELANGGAN:*\n`;
    whatsappMessage += `Nama: ${name}\n`;
    whatsappMessage += `WhatsApp: ${phone}\n`;
    whatsappMessage += `Alamat: ${address}\n`;
    whatsappMessage += `Metode Bayar: ${payment}\n`;
    
    if (notes) {
        whatsappMessage += `Catatan: ${notes}\n`;
    }
    
    whatsappMessage += `\n*DETAIL ORDER:*\n`;
    
    let total = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        whatsappMessage += `${index + 1}. ${item.name}\n`;
        whatsappMessage += `   ${item.quantity} × ${formatPrice(item.price)} = ${formatPrice(itemTotal)}\n`;
    });
    
    whatsappMessage += `\n*TOTAL: ${formatPrice(total)}*\n\n`;
    whatsappMessage += `_Pesanan ini dibuat via Telegram Mini App_`;
    
    // URL WhatsApp yang BENAR
    const whatsappURL = `https://api.whatsapp.com/send?phone=${CONFIG.ADMIN_WHATSAPP}&text=${encodeURIComponent(whatsappMessage)}`;
    
    // Simpan order ke localStorage
    saveOrderToLocalStorage({
        orderId,
        date: orderDate,
        customer: { name, phone: formattedPhone, address },
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
    
    // Buka WhatsApp di tab baru
    window.open(whatsappURL, '_blank');
    
    // Reset keranjang
    cart = [];
    updateCartDisplay();
    renderProducts(currentCategory);
    
    // Tutup modal
    closeCheckoutForm();
    hideCart();
    
    // Tampilkan konfirmasi
    showNotification('✅ Order berhasil! WhatsApp admin terbuka.');
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
        const existingOrders = JSON.parse(localStorage.getItem('LadangVApeOrders') || '[]');
        
        // Tambah order baru
        existingOrders.unshift(orderData);
        
        // Simpan maksimal 50 order terakhir
        const trimmedOrders = existingOrders.slice(0, 50);
        
        // Simpan ke localStorage
        localStorage.setItem('LadangVApeOrders', JSON.stringify(trimmedOrders));
        
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

// Tambah fungsi ini di akhir file script.js
function debugProducts() {
    console.log("=== DEBUG PRODUK ===");
    console.log("Total produk:", allProducts.length);
    
    allProducts.forEach((product, index) => {
        console.log(`Produk #${index + 1}:`, {
            nama: product.name,
            harga: product.price,
            kategori: product.category,
            gambar: product.image || '(tidak ada)',
            panjang_link: product.image ? product.image.length : 0
        });
    });
    
    // Cek apakah gambar load
    if (allProducts.length > 0 && allProducts[0].image) {
        console.log("Testing gambar pertama:", allProducts[0].image);
        
        // Test load gambar
        const testImg = new Image();
        testImg.onload = () => console.log("✅ Gambar bisa di-load");
        testImg.onerror = () => console.log("❌ Gambar ERROR (404 atau CORS)");
        testImg.src = allProducts[0].image;
    }
}

// Panggil setelah load products
// Tambah di fungsi loadProductsFromGoogleSheets(), setelah allProducts = parseCSV(csvData);
debugProducts();

async function loadProductsFromGoogleSheets() {
    showLoading(true);
    
    // Cek cache dulu (valid 5 menit)
    const cacheKey = 'LadangVApe_products_cache';
    const cacheTimeKey = 'LadangVApe_cache_time';
    const now = Date.now();
    const cacheExpiry = 5 * 60 * 1000; // 5 menit
    
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const cachedData = localStorage.getItem(cacheKey);
    
    // Jika cache masih valid
    if (cachedData && cachedTime && (now - parseInt(cachedTime)) < cacheExpiry) {
        console.log('📦 Menggunakan data cache');
        allProducts = JSON.parse(cachedData);
        renderProducts('all');
        showLoading(false);
        return;
    }
    
    try {
        // Load dari Google Sheets
        const response = await fetch(CONFIG.GOOGLE_SHEETS_URL);
        const csvData = await response.text();
        
        allProducts = parseCSV(csvData);
        
        if (allProducts.length === 0) {
            throw new Error('Data kosong');
        }
        
        // Simpan ke cache
        localStorage.setItem(cacheKey, JSON.stringify(allProducts));
        localStorage.setItem(cacheTimeKey, now.toString());
        
        console.log(`✅ ${allProducts.length} produk dimuat & dicache`);
        renderProducts('all');
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        // Fallback ke cache lama atau sample
        if (cachedData) {
            allProducts = JSON.parse(cachedData);
            showNotification('⚠️ Menggunakan data cache (offline mode)');
        } else {
            allProducts = getSampleProducts();
            showNotification('⚠️ Menggunakan data sample');
        }
        
        renderProducts('all');
    } finally {
        showLoading(false);
    }
}

// Debug function
function debugLoadTime() {
    console.log('=== DEBUG LOAD TIME ===');
    console.log('Google Sheets URL:', CONFIG.GOOGLE_SHEETS_URL);
    
    // Test fetch speed
    const startTime = Date.now();
    fetch(CONFIG.GOOGLE_SHEETS_URL)
        .then(res => {
            const fetchTime = Date.now() - startTime;
            console.log(`Fetch time: ${fetchTime}ms`);
            return res.text();
        })
        .then(text => {
            const parseTime = Date.now() - startTime;
            console.log(`Total time: ${parseTime}ms`);
            console.log(`Data size: ${text.length} chars`);
            console.log(`Lines: ${text.split('\n').length}`);
        })
        .catch(err => {
            console.error('Fetch error:', err);
        });
}

// Jalankan di console: debugLoadTime()

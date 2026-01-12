// ============================================
// KONFIGURASI APLIKASI - EDIT BAGIAN INI!
// ============================================
const CONFIG = {
    // 1. GANTI dengan URL Google Sheets Anda
    // Cara: File → Share → Publish to web → CSV → Copy link
    GOOGLE_SHEETS_URL: "https://docs.google.com/spreadsheets/d/e/YOUR_SHEET_ID/pub?output=csv",
    
    // 2. GANTI dengan nomor WhatsApp admin (format: 6285121251820)
    ADMIN_WHATSAPP: "6285121251820",
    
    // 3. GANTI dengan nama toko Anda
    STORE_NAME: "Ladang Vape Store",
    
    // 4. Cache time dalam milidetik (5 menit)
    CACHE_TIME: 5 * 60 * 1000
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
function initApp() {
    console.log('🚀 Aplikasi Ladang Vape dimulai...');
    
    // Update cart dulu
    updateCartDisplay();
    
    // Load produk di background
    setTimeout(() => {
        loadProductsFromGoogleSheets();
    }, 100);
    
    // Telegram Web App setup
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.expand();
        tg.enableClosingConfirmation();
        tg.MainButton.setText("🛒 Keranjang");
        tg.MainButton.onClick(showCart);
        tg.MainButton.show();
        console.log('Telegram Web App aktif');
    }
    
    // Sembunyikan loading screen setelah 3 detik max
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }
    }, 3000);
}

// Event listener
document.addEventListener('DOMContentLoaded', initApp);

// ============================================
// FUNGSI LOAD PRODUK DARI GOOGLE SHEETS
// ============================================
async function loadProductsFromGoogleSheets() {
    showLoading(true);
    updateLoadingText('Memuat produk dari Google Sheets...');
    
    try {
        console.log('📥 Memulai load produk...');
        
        // Cek cache dulu
        const cached = checkCache();
        if (cached) {
            console.log('📦 Menggunakan data cache');
            allProducts = cached;
            renderProducts('all');
            showLoading(false);
            return;
        }
        
        // Fetch dari Google Sheets dengan timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(CONFIG.GOOGLE_SHEETS_URL, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvData = await response.text();
        console.log('✅ Data diterima:', csvData.length, 'karakter');
        
        // Parse CSV
        allProducts = parseCSV(csvData);
        
        if (allProducts.length === 0) {
            console.warn('⚠️ Tidak ada produk ditemukan');
            throw new Error('Data kosong');
        }
        
        console.log(`✅ ${allProducts.length} produk berhasil dimuat`);
        
        // Simpan ke cache
        saveToCache(allProducts);
        
        // Render produk
        renderProducts('all');
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        
        // Fallback ke sample data
        allProducts = getSampleProducts();
        renderProducts('all');
        
        // Tampilkan notifikasi
        if (error.name === 'AbortError') {
            showNotification('⚠️ Koneksi timeout, menggunakan data cache');
        } else {
            showNotification('⚠️ Gagal memuat data, menggunakan data contoh');
        }
        
    } finally {
        showLoading(false);
    }
}

// ============================================
// FUNGSI PARSE CSV DENGAN AUTO IMAGE
// ============================================
function parseCSV(csvText) {
    console.time('parseCSV');
    
    try {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            console.warn('CSV kosong atau hanya header');
            return [];
        }
        
        // Ambil header (baris pertama)
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        console.log('📋 Header terdeteksi:', headers);
        
        const products = [];
        
        // Proses setiap baris data
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Handle CSV dengan koma di dalam quotes
            const values = parseCSVLine(line);
            
            const product = {
                id: i,
                name: '',
                price: 0,
                category: 'liquid',
                desc: '',
                stock: 10,
                image: ''
            };
            
            // Mapping kolom berdasarkan header
            headers.forEach((header, index) => {
                const value = values[index] ? values[index].trim() : '';
                
                // Auto-detect kolom
                if (header.includes('nama') || header.includes('name')) {
                    product.name = value;
                } else if (header.includes('harga') || header.includes('price')) {
                    product.price = parseInt(value.replace(/[^0-9]/g, '')) || 0;
                } else if (header.includes('kategori') || header.includes('category')) {
                    product.category = value.toLowerCase();
                } else if (header.includes('deskripsi') || header.includes('desc')) {
                    product.desc = value;
                } else if (header.includes('stok') || header.includes('stock')) {
                    product.stock = parseInt(value) || 0;
                } else if (header.includes('gambar') || header.includes('image') || 
                          header.includes('foto') || header.includes('photo') ||
                          header.includes('url') || header.includes('link')) {
                    product.image = value;
                }
            });
            
            // Validasi produk minimal
            if (product.name && product.price > 0) {
                // Standardisasi kategori
                const cat = product.category.toLowerCase();
                if (cat.includes('liquid') || cat.includes('cairan')) product.category = 'liquid';
                else if (cat.includes('device') || cat.includes('mod') || cat.includes('kit')) product.category = 'device';
                else if (cat.includes('pod') || cat.includes('disposable')) product.category = 'pod';
                else if (cat.includes('coil') || cat.includes('head')) product.category = 'coil';
                else if (cat.includes('aksesoris') || cat.includes('accessory')) product.category = 'aksesoris';
                
                // Auto-fix Google Drive links
                if (product.image && product.image.includes('drive.google.com')) {
                    product.image = convertGoogleDriveLink(product.image);
                }
                
                products.push(product);
            }
        }
        
        console.timeEnd('parseCSV');
        console.log(`📊 Parsed ${products.length} produk dengan gambar`);
        return products;
        
    } catch (error) {
        console.error('Error parsing CSV:', error);
        return [];
    }
}

// Helper untuk parse CSV line dengan quotes
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

// Convert Google Drive link ke direct link
function convertGoogleDriveLink(url) {
    if (!url) return '';
    
    if (url.includes('drive.google.com/file/d/')) {
        // Format: https://drive.google.com/file/d/FILE_ID/view
        const match = url.match(/\/d\/([^\/]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
    } else if (url.includes('drive.google.com/open?id=')) {
        // Format: https://drive.google.com/open?id=FILE_ID
        const match = url.match(/id=([^&]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
    }
    
    return url; // Return original jika bukan Google Drive
}

// ============================================
// CACHE SYSTEM
// ============================================
function checkCache() {
    try {
        const cacheKey = 'ladangVape_products_cache';
        const cacheTimeKey = 'ladangVape_cache_time';
        
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);
        
        if (cachedData && cachedTime) {
            const timeDiff = Date.now() - parseInt(cachedTime);
            
            if (timeDiff < CONFIG.CACHE_TIME) {
                return JSON.parse(cachedData);
            } else {
                console.log('Cache expired');
                localStorage.removeItem(cacheKey);
                localStorage.removeItem(cacheTimeKey);
            }
        }
    } catch (error) {
        console.error('Cache error:', error);
    }
    
    return null;
}

function saveToCache(products) {
    try {
        localStorage.setItem('ladangVape_products_cache', JSON.stringify(products));
        localStorage.setItem('ladangVape_cache_time', Date.now().toString());
        console.log('✅ Data disimpan ke cache');
    } catch (error) {
        console.error('Gagal menyimpan cache:', error);
    }
}

// ============================================
// DATA CONTOH (FALLBACK)
// ============================================
function getSampleProducts() {
    return [
        {
            id: 1,
            name: "CT INFY PLUS CHERRY STRAWBERRY 2.5 ML",
            price: 150,
            category: "liquid",
            desc: "Liquid saltnic rasa cherry strawberry",
            stock: 10,
            image: ""
        },
        {
            id: 2,
            name: "CT INFY PLUS APPLE ALOE VERA 2.5 ML",
            price: 150,
            category: "liquid",
            desc: "Liquid saltnic rasa apple aloe vera",
            stock: 5,
            image: ""
        },
        {
            id: 3,
            name: "VAPORESSO XROS 3 POD KIT",
            price: 350000,
            category: "device",
            desc: "Pod system dengan adjustable airflow",
            stock: 3,
            image: ""
        },
        {
            id: 4,
            name: "ELF BAR BC5000 DISPOSABLE",
            price: 250000,
            category: "pod",
            desc: "Disposable pod 5000 puffs",
            stock: 8,
            image: ""
        }
    ];
}

// ============================================
// FUNGSI RENDER PRODUK DENGAN GAMBAR
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
        
        // Tentukan status stok
        const stockStatus = product.stock === 0 ? 'out-of-stock' : 
                           product.stock < 5 ? 'low-stock' : 'in-stock';
        const stockText = product.stock === 0 ? 'Habis' : 
                          product.stock < 5 ? `Stok: ${product.stock}` : 'Tersedia';
        
        // Tentukan icon stok
        const stockIcon = product.stock === 0 ? 'fa-times-circle' : 
                         product.stock < 5 ? 'fa-exclamation-triangle' : 'fa-check-circle';
        
        // Handle gambar - dengan fallback jika error
        const productImage = product.image && product.image.trim() !== '' ? 
            `<img src="${product.image}" alt="${product.name}" 
                 onerror="this.onerror=null; this.src=''; this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
            '';
        
        return `
        <div class="product-card" data-category="${product.category}">
            <div class="product-image">
                ${productImage}
                <div class="image-fallback" ${product.image ? 'style="display:none;"' : ''}>
                    <i class="fas fa-smoking"></i>
                </div>
                ${product.stock < 5 && product.stock > 0 ? '<span class="product-badge">Hampir Habis</span>' : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <span class="product-category">${product.category ? product.category.toUpperCase() : 'LIQUID'}</span>
                
                <div class="product-price">${formatPrice(product.price)}</div>
                
                <div class="product-stock-simple ${stockStatus}">
                    <i class="fas ${stockIcon}"></i>
                    ${stockText}
                </div>
                
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
            </div>
        </div>
        `;
    }).join('');
    
    emptyState.style.display = 'none';
}

// ============================================
// FUNGSI FILTER PRODUK
// ============================================
function filterProducts(category) {
    // Update tombol kategori aktif
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Aktifkan tombol kategori yang sesuai
    const activeBtn = Array.from(document.querySelectorAll('.category-btn'))
        .find(btn => btn.getAttribute('onclick')?.includes(`'${category}'`));
    
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
            showNotification(`❌ Stok ${product.name} hanya ${product.stock}`);
            return;
        } else {
            // Update quantity
            cart[index].quantity = newQuantity;
        }
    } else if (change > 0) {
        // Tambah produk baru ke keranjang
        if (product.stock === 0) {
            showNotification(`❌ ${product.name} sedang habis`);
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
    
    // Feedback
    if (change > 0) {
        showNotification(`✅ ${product.name} ditambahkan`);
    }
}

function updateCartDisplay() {
    // Update jumlah item di icon keranjang
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartBadge').textContent = totalItems;
    
    // Update daftar item di sidebar
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
                    <span class="cart-item-quantity">${item.quantity}</span>
                    <button class="cart-item-btn add-btn" onclick="updateQuantity(${item.id}, 1)"
                        ${item.quantity >= item.stock ? 'disabled style="opacity:0.5;"' : ''}>
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Update harga total
    document.getElementById('subtotalPrice').textContent = formatPrice(subtotal);
    document.getElementById('totalPrice').textContent = formatPrice(subtotal);
    
    // Update Telegram MainButton
    if (tg) {
        tg.MainButton.setText(totalItems > 0 ? `🛒 Keranjang (${totalItems})` : "🛒 Buka Keranjang");
    }
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
// FUNGSI CHECKOUT & WHATSAPP
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
    cart.forEach((item, index) => {
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
    const cleanPhone = phone.replace(/\D/g, '');
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
    
    // Generate order ID
    const orderId = 'ORD' + Date.now().toString().slice(-8);
    const orderDate = new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Format pesan untuk WhatsApp
    let whatsappMessage = `*${CONFIG.STORE_NAME}*\n`;
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
    
    // Encode pesan untuk URL
    const encodedMessage = encodeURIComponent(whatsappMessage);
    
    // Buat URL WhatsApp
    const whatsappURL = `https://wa.me/${CONFIG.ADMIN_WHATSAPP}?text=${encodedMessage}`;
    
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
    showNotification('✅ Order berhasil! Admin akan menghubungi Anda.');
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

function showLoading(show) {
    const loadingEl = document.getElementById('loadingScreen');
    if (loadingEl) {
        if (show) {
            loadingEl.style.display = 'flex';
            loadingEl.style.opacity = '1';
        } else {
            loadingEl.style.opacity = '0';
            setTimeout(() => {
                loadingEl.style.display = 'none';
            }, 300);
        }
    }
}

function updateLoadingText(text) {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = text;
    }
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
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        max-width: 300px;
        font-weight: 500;
        font-size: 14px;
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
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function saveOrderToLocalStorage(orderData) {
    try {
        const existingOrders = JSON.parse(localStorage.getItem('ladangVape_orders') || '[]');
        existingOrders.unshift(orderData);
        
        // Simpan maksimal 50 order terakhir
        const trimmedOrders = existingOrders.slice(0, 50);
        localStorage.setItem('ladangVape_orders', JSON.stringify(trimmedOrders));
        
        console.log('✅ Order disimpan:', orderData.orderId);
    } catch (error) {
        console.error('❌ Gagal menyimpan order:', error);
    }
}

// ============================================
// EXPOSE FUNCTIONS KE WINDOW
// ============================================
window.filterProducts = filterProducts;
window.updateQuantity = updateQuantity;
window.showCart = showCart;
window.hideCart = hideCart;
window.openCheckoutForm = openCheckoutForm;
window.closeCheckoutForm = closeCheckoutForm;
window.processCheckout = processCheckout;

// ============================================
// DEBUG FUNCTIONS (opsional)
// ============================================
function debugProducts() {
    console.log('=== DEBUG PRODUK ===');
    console.log('Total produk:', allProducts.length);
    console.log('Dengan gambar:', allProducts.filter(p => p.image).length);
    
    allProducts.forEach((product, index) => {
        console.log(`Produk #${index + 1}:`, {
            nama: product.name,
            harga: product.price,
            kategori: product.category,
            gambar: product.image || '(tidak ada)',
            stok: product.stock
        });
    });
}

// Jalankan: debugProducts() di Console

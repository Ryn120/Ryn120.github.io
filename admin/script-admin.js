import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDCEU9nyFJi-eSy0Uq3ysXbQlV7Ri4x-Gs",
  authDomain: "qr-generet01.firebaseapp.com",
  projectId: "qr-generet01",
  storageBucket: "qr-generet01.firebasestorage.app",
  messagingSenderId: "753131681292",
  appId: "1:753131681292:web:d7622e7188ba1395e8a029"
};

// Inisialisasi Firebase
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase berhasil diinisialisasi");
} catch (error) {
    console.error("Error inisialisasi Firebase:", error);
    showError("Gagal menghubungkan ke database. Periksa koneksi internet.");
}

const DB_COLLECTION = "peserta";
let globalData = [];

// --- UTILITY FUNCTIONS ---
const getElement = (id) => document.getElementById(id);

const showError = (message) => {
    const loadingOverlay = getElement('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.innerHTML = `
            <div style="text-align: center; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                <h3>Terjadi Kesalahan</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Refresh Halaman
                </button>
            </div>
        `;
    }
};

const showToast = (message, type = 'info') => {
    const toast = getElement('toast');
    const toastMessage = getElement('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.style.background = colors[type] || colors.info;
    toastMessage.innerHTML = `${icons[type] || ''} ${message}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
};

// --- MAIN DATA LOGIC ---
const initializeDataTable = () => {
    if (!db) {
        showError("Database tidak tersedia. Periksa koneksi Firebase.");
        return;
    }

    try {
        // Realtime listener untuk data peserta
        const unsubscribe = onSnapshot(collection(db, DB_COLLECTION), 
            (snapshot) => {
                globalData = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    globalData.push({
                        id: doc.id,
                        code: data.code || '-',
                        nama: data.nama || '-',
                        nomorTiket: data.nomorTiket || data.code || '-',
                        email: data.email || '-',
                        hp: data.hp || '-',
                        createdAt: data.createdAt || new Date().toISOString()
                    });
                });
                
                console.log(`Data loaded: ${globalData.length} peserta`);
                
                // Urutkan berdasarkan nama
                globalData.sort((a, b) => a.nama.localeCompare(b.nama));
                
                renderTable(globalData);
                
                // Sembunyikan loading
                const loadingOverlay = getElement('loadingOverlay');
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                
            },
            (error) => {
                console.error("Error loading data:", error);
                showError(`Gagal memuat data: ${error.message}`);
            }
        );

        // Cleanup saat halaman ditutup
        window.addEventListener('beforeunload', () => {
            unsubscribe();
        });

    } catch (error) {
        console.error("Error in initializeDataTable:", error);
        showError(`Error: ${error.message}`);
    }
};

const renderTable = (dataArray) => {
    const tableBody = getElement('tableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    if (dataArray.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 2em; margin-bottom: 10px;">📭</div>
                    <strong>Tidak ada data peserta</strong>
                    <p style="margin-top: 10px; color: #999;">Database kosong</p>
                </td>
            </tr>`;
        return;
    }
    
    dataArray.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="text-align:center;">
                <div id="qr-${user.code}" class="qr-container"></div>
            </td>
            <td><b>${user.code}</b></td>
            <td>${user.nama}</td>
            <td>${user.nomorTiket}</td>
            <td>${user.email}</td>
            <td>${user.hp}</td>
            <td>
                <button class="btn-delete" data-id="${user.id}" title="Hapus peserta ${user.nama}">
                    🗑️ Hapus
                </button>
            </td>`;
        tableBody.appendChild(row);
        
        // Generate QR Code
        setTimeout(() => {
            const qrElem = document.getElementById(`qr-${user.code}`);
            if (qrElem && !qrElem.hasChildNodes() && typeof QRCode !== 'undefined') {
                try {
                    new QRCode(qrElem, {
                        text: user.code,
                        width: 60,
                        height: 60,
                        colorDark: "#2c3e50",
                        colorLight: "#ffffff"
                    });
                } catch (qrError) {
                    console.error("QR Code generation error:", qrError);
                    qrElem.innerHTML = `<div style="color: #666; font-size: 12px;">QR Error</div>`;
                }
            }
        }, 0);
    });

    // Event listener untuk tombol hapus
    tableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            const row = e.target.closest('tr');
            const userName = row ? row.querySelector('td:nth-child(3)').textContent : 'peserta';
            
            if (confirm(`Hapus peserta "${userName}"?`)) {
                try {
                    e.target.disabled = true;
                    e.target.innerHTML = '⏳ Menghapus...';
                    await deleteDoc(doc(db, DB_COLLECTION, id));
                    showToast(`Data "${userName}" berhasil dihapus`, 'success');
                } catch (error) {
                    console.error("Delete error:", error);
                    showToast(`Gagal menghapus: ${error.message}`, 'error');
                    e.target.disabled = false;
                    e.target.innerHTML = '🗑️ Hapus';
                }
            }
        }
    });
};

// Fungsi pencarian
const searchData = () => {
    const searchInput = getElement('searchInput');
    if (!searchInput || globalData.length === 0) return;
    
    const term = searchInput.value.trim().toLowerCase();
    if (!term) {
        renderTable(globalData);
        return;
    }
    
    const filtered = globalData.filter(user => 
        user.nama.toLowerCase().includes(term) ||
        user.code.toLowerCase().includes(term) ||
        user.nomorTiket.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.hp.toLowerCase().includes(term)
    );
    
    renderTable(filtered);
    
    if (filtered.length === 0) {
        showToast(`Tidak ditemukan hasil untuk "${term}"`, 'warning');
    }
};

// Fungsi pengurutan
let isAscending = true;
const sortData = () => {
    if (globalData.length === 0) return;
    
    globalData.sort((a, b) => {
        if (isAscending) {
            return a.nama.localeCompare(b.nama);
        } else {
            return b.nama.localeCompare(a.nama);
        }
    });
    
    const sortButton = getElement('btnSort');
    if (sortButton) {
        isAscending = !isAscending;
        sortButton.textContent = isAscending ? '📊 Urutkan Z-A' : '📊 Urutkan A-Z';
    }
    
    renderTable(globalData);
};

// --- SCANNER LOGIC (untuk scan.html) ---
const initializeScanner = () => {
    const reader = getElement('reader');
    if (!reader) return;
    
    // Periksa apakah library scanner tersedia
    if (typeof Html5QrcodeScanner === 'undefined') {
        reader.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #666;">
                <h3>Scanner akan dimuat...</h3>
                <p>Memuat library scanner...</p>
            </div>`;
        
        // Coba load library scanner
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.onload = () => {
            console.log('Scanner library loaded');
            startScanner();
        };
        script.onerror = () => {
            reader.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #dc3545;">
                    <h3>⚠️ Gagal memuat scanner</h3>
                    <p>Silakan refresh halaman</p>
                </div>`;
        };
        document.head.appendChild(script);
    } else {
        startScanner();
    }
};

const startScanner = () => {
    const reader = getElement('reader');
    if (!reader) return;
    
    try {
        const scanner = new Html5QrcodeScanner(
            "reader", 
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            }, 
            false
        );
        
        scanner.render(
            (decodedText) => {
                // Handle scan success
                console.log('Scanned:', decodedText);
                scanner.pause();
                
                const resultDiv = getElement('scanResult');
                if (resultDiv) {
                    resultDiv.style.display = 'block';
                    resultDiv.innerHTML = `
                        <div style="background: #d4edda; padding: 20px; border-radius: 10px;">
                            <h3>✅ Scan Berhasil</h3>
                            <p>Kode: <strong>${decodedText}</strong></p>
                        </div>
                    `;
                }
                
                // Resume scanner setelah 3 detik
                setTimeout(() => {
                    scanner.resume();
                    if (resultDiv) {
                        resultDiv.style.display = 'none';
                    }
                }, 3000);
            },
            (error) => {
                // Handle scan error (biasanya error karena tidak menemukan QR)
                console.warn('Scan error:', error);
            }
        );
    } catch (error) {
        console.error('Scanner error:', error);
        reader.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #dc3545;">
                <h3>⚠️ Scanner Error</h3>
                <p>${error.message}</p>
            </div>`;
    }
};

// --- PAGE INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Loaded, initializing...');
    
    // Periksa halaman mana yang sedang aktif
    const path = window.location.pathname;
    const isIndexPage = path.includes('index.html') || path.endsWith('/') || path.endsWith('/admin/');
    const isScanPage = path.includes('scan.html');
    
    if (isIndexPage) {
        console.log('Initializing index page...');
        initializeDataTable();
        
        // Setup event listeners
        const searchInput = getElement('searchInput');
        const sortButton = getElement('btnSort');
        
        if (searchInput) {
            searchInput.addEventListener('input', searchData);
        }
        
        if (sortButton) {
            sortButton.addEventListener('click', sortData);
        }
        
    } else if (isScanPage) {
        console.log('Initializing scanner page...');
        
        // Setup scanner setelah delay kecil
        setTimeout(() => {
            initializeScanner();
            
            // Sembunyikan loading
            const loadingOverlay = getElement('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }, 1000);
    }
    
    // Auto-hide loading setelah 10 detik (fallback)
    setTimeout(() => {
        const loadingOverlay = getElement('loadingOverlay');
        if (loadingOverlay && loadingOverlay.style.display !== 'none') {
            loadingOverlay.style.display = 'none';
            showToast('Waktu muat terlalu lama. Periksa koneksi internet.', 'warning');
        }
    }, 10000);
});

// Export functions ke global scope
window.searchData = searchData;
window.sortData = sortData;
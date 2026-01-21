import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, deleteDoc, doc,
    query, where, getDocs 
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const DB_COLLECTION = "peserta";

let globalData = [];

// --- UTILITY FUNCTIONS ---
const getElement = (id) => document.getElementById(id);

const showToast = (message, type = 'info') => {
    const toast = getElement('toast');
    const toastMessage = getElement('toastMessage');
    
    if (!toast || !toastMessage) {
        // Create toast if doesn't exist
        const newToast = document.createElement('div');
        newToast.id = 'toast';
        newToast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
        `;
        newToast.innerHTML = '<span id="toastMessage"></span>';
        document.body.appendChild(newToast);
    }
    
    const finalToast = getElement('toast');
    const finalToastMessage = getElement('toastMessage');
    
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
    
    finalToast.style.background = colors[type] || colors.info;
    finalToastMessage.innerHTML = `${icons[type] || ''} ${message}`;
    finalToast.style.display = 'block';
    
    setTimeout(() => {
        finalToast.style.display = 'none';
    }, 3000);
};

// --- MAIN DATA LOGIC ---
const initializeDataTable = () => {
    const tableBody = getElement('tableBody');
    const loadingOverlay = getElement('loadingOverlay');
    
    if (!tableBody) return;
    
    console.log('Initializing data table...');
    
    // Realtime listener untuk data peserta
    const unsubscribe = onSnapshot(collection(db, DB_COLLECTION), 
        (snapshot) => {
            globalData = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                globalData.push({
                    id: doc.id,
                    code: data.code || doc.id || '-',
                    nama: data.nama || '-',
                    nomorTiket: data.nomorTiket || data.ticketNumber || '-',
                    email: data.email || '-',
                    hp: data.hp || data.phone || '-',
                    createdAt: data.createdAt ? data.createdAt.toDate().toLocaleString('id-ID') : 'N/A'
                });
            });
            
            console.log(`Data loaded: ${globalData.length} peserta`);
            
            // Urutkan berdasarkan tanggal dibuat (terbaru dulu)
            globalData.sort((a, b) => {
                if (a.createdAt === 'N/A' && b.createdAt === 'N/A') return 0;
                if (a.createdAt === 'N/A') return 1;
                if (b.createdAt === 'N/A') return -1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            
            renderTable(globalData);
            
            // Sembunyikan loading
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            showToast(`Data diperbarui: ${globalData.length} peserta`, 'success');
        },
        (error) => {
            console.error("Error loading data:", error);
            showToast("Gagal memuat data dari database", 'error');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }
    );
    
    // Cleanup saat halaman ditutup
    window.addEventListener('beforeunload', () => {
        if (unsubscribe) unsubscribe();
    });
};

const renderTable = (dataArray) => {
    const tableBody = getElement('tableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    if (dataArray.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 2em; margin-bottom: 10px;">📭</div>
                    <strong>Tidak ada data peserta</strong>
                    <p style="margin-top: 10px; color: #999;">Belum ada peserta yang terdaftar</p>
                </td>
            </tr>`;
        return;
    }
    
    dataArray.forEach((user, index) => {
        const row = document.createElement('tr');
        
        // Generate QR code ID yang aman
        const qrId = `qr-${user.code.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        row.innerHTML = `
            <td style="text-align:center; padding: 10px;">
                <div id="${qrId}" class="qr-container"></div>
            </td>
            <td><strong>${user.code}</strong></td>
            <td>${user.nama}</td>
            <td>${user.nomorTiket}</td>
            <td><a href="mailto:${user.email}" style="color: #007bff;">${user.email}</a></td>
            <td><a href="tel:${user.hp}" style="color: #007bff;">${user.hp}</a></td>
            <td>${user.createdAt}</td>
            <td>
                <button class="btn-delete" data-id="${user.id}" title="Hapus peserta ${user.nama}">
                    🗑️ Hapus
                </button>
            </td>`;
        tableBody.appendChild(row);
        
        // Generate QR Code setelah row ditambahkan
        setTimeout(() => {
            const qrElem = document.getElementById(qrId);
            if (qrElem && !qrElem.hasChildNodes()) {
                try {
                    // Pastikan QRCode library tersedia
                    if (typeof QRCode !== 'undefined') {
                        new QRCode(qrElem, {
                            text: user.code,
                            width: 70,
                            height: 70,
                            colorDark: "#2c3e50",
                            colorLight: "#ffffff",
                            correctLevel: QRCode.CorrectLevel.H
                        });
                    } else {
                        qrElem.innerHTML = `
                            <div style="color: #666; font-size: 10px; text-align: center;">
                                <div>QR Code</div>
                                <div style="margin-top: 5px; font-size: 8px;">${user.code.substring(0, 8)}...</div>
                            </div>`;
                    }
                } catch (qrError) {
                    console.error("QR Code generation error:", qrError);
                    qrElem.innerHTML = `<div style="color: #dc3545; font-size: 10px;">QR Error</div>`;
                }
            }
        }, 100);
    });

    // Event delegation untuk tombol hapus
    tableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            const row = e.target.closest('tr');
            const userName = row ? row.querySelector('td:nth-child(3)').textContent : 'peserta';
            
            if (confirm(`Yakin ingin menghapus peserta "${userName}"? Tindakan ini tidak dapat dibatalkan!`)) {
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
let searchTimeout;
const searchData = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const searchInput = getElement('searchInput');
        if (!searchInput || globalData.length === 0) return;
        
        const term = searchInput.value.trim().toLowerCase();
        if (!term) {
            renderTable(globalData);
            return;
        }
        
        const filtered = globalData.filter(user => 
            (user.nama && user.nama.toLowerCase().includes(term)) ||
            (user.code && user.code.toLowerCase().includes(term)) ||
            (user.nomorTiket && user.nomorTiket.toString().toLowerCase().includes(term)) ||
            (user.email && user.email.toLowerCase().includes(term)) ||
            (user.hp && user.hp.toLowerCase().includes(term))
        );
        
        renderTable(filtered);
        
        if (filtered.length === 0) {
            showToast(`Tidak ditemukan hasil untuk "${term}"`, 'warning');
        }
    }, 300);
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
    
    isAscending = !isAscending;
    const sortButton = getElement('btnSort');
    if (sortButton) {
        sortButton.textContent = isAscending ? '📊 Urutkan Z-A' : '📊 Urutkan A-Z';
    }
    
    renderTable(globalData);
    showToast(`Data diurutkan ${isAscending ? 'A-Z' : 'Z-A'}`, 'info');
};

// --- SCANNER LOGIC ---
const initializeScanner = () => {
    const reader = getElement('reader');
    if (!reader) {
        console.log('Scanner element not found');
        return;
    }
    
    console.log('Initializing scanner...');
    
    // Check if Html5QrcodeScanner is available
    if (typeof Html5QrcodeScanner === 'undefined') {
        console.error('Html5QrcodeScanner is not defined');
        reader.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666; background: #f8f9fa; border-radius: 10px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📱</div>
                <h3>Memuat Scanner...</h3>
                <p>Harap tunggu sebentar</p>
            </div>`;
        
        // Try to load the scanner library
        setTimeout(() => {
            if (typeof Html5QrcodeScanner !== 'undefined') {
                initializeScanner();
            }
        }, 1000);
        return;
    }
    
    try {
        const scanner = new Html5QrcodeScanner(
            "reader", 
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true
            }, 
            false
        );
        
        let isScanning = false;
        
        scanner.render(
            async (decodedText) => {
                if (isScanning) return;
                isScanning = true;
                
                console.log('QR Code detected:', decodedText);
                
                // Pause scanner temporarily
                scanner.pause();
                
                try {
                    // Clean the scanned code
                    const scannedCode = decodedText.trim();
                    
                    // Query untuk mencari peserta berdasarkan code
                    const q = query(
                        collection(db, DB_COLLECTION), 
                        where("code", "==", scannedCode)
                    );
                    
                    const querySnapshot = await getDocs(q);
                    
                    const resultDiv = getElement('scanResult');
                    if (!resultDiv) return;
                    
                    if (!querySnapshot.empty) {
                        const doc = querySnapshot.docs[0];
                        const user = doc.data();
                        
                        // Tampilkan hasil validasi
                        resultDiv.style.display = 'block';
                        resultDiv.innerHTML = `
                            <div style="background: linear-gradient(135deg, #d4edda, #c3e6cb); padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                                    <div style="background: #28a745; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                                        ✅
                                    </div>
                                    <div>
                                        <h3 style="margin: 0; color: #155724;">TIKET VALID</h3>
                                        <p style="margin: 5px 0 0 0; color: #0c5460; font-size: 14px;">
                                            ${new Date().toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                </div>
                                
                                <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                                    <p><strong>👤 Nama:</strong> ${user.nama || '-'}</p>
                                    <p><strong>🔢 Kode:</strong> <code style="background: #f8f9fa; padding: 3px 8px; border-radius: 4px; font-family: monospace;">${scannedCode}</code></p>
                                    <p><strong>🎫 No. Tiket:</strong> ${user.nomorTiket || '-'}</p>
                                    <p><strong>📧 Email:</strong> ${user.email || '-'}</p>
                                    <p><strong>📱 No. HP:</strong> ${user.hp || '-'}</p>
                                    ${user.createdAt ? `<p><strong>📅 Terdaftar:</strong> ${user.createdAt.toDate().toLocaleDateString('id-ID')}</p>` : ''}
                                </div>
                                
                                <div style="text-align: center; padding: 12px; background: #28a745; color: white; border-radius: 8px; font-weight: bold;">
                                    ✅ PESERTA TERVERIFIKASI - BOLEH MASUK
                                </div>
                            </div>
                        `;
                        
                        // Success sound
                        playSound('success');
                        
                    } else {
                        // Data tidak ditemukan
                        resultDiv.style.display = 'block';
                        resultDiv.innerHTML = `
                            <div style="background: linear-gradient(135deg, #f8d7da, #f5c6cb); padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                                    <div style="background: #dc3545; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                                        ❌
                                    </div>
                                    <div>
                                        <h3 style="margin: 0; color: #721c24;">TIKET TIDAK VALID</h3>
                                        <p style="margin: 5px 0 0 0; color: #856404; font-size: 14px;">
                                            ${new Date().toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                </div>
                                
                                <div style="background: white; padding: 20px; border-radius: 10px;">
                                    <p><strong>Kode yang discan:</strong></p>
                                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; margin: 10px 0; font-family: monospace;">
                                        ${scannedCode}
                                    </div>
                                    <p style="color: #666; font-size: 14px; margin-top: 15px;">
                                        <i>⚠️ Kode tidak ditemukan dalam database. Pastikan QR Code sesuai.</i>
                                    </p>
                                </div>
                                
                                <div style="text-align: center; padding: 12px; background: #dc3545; color: white; border-radius: 8px; font-weight: bold; margin-top: 15px;">
                                    ❌ AKSES DITOLAK - TIKET TIDAK VALID
                                </div>
                            </div>
                        `;
                        
                        // Error sound
                        playSound('error');
                    }
                    
                    // Auto-hide result after 5 seconds
                    setTimeout(() => {
                        resultDiv.style.display = 'none';
                        resultDiv.innerHTML = '';
                    }, 5000);
                    
                } catch (error) {
                    console.error('Scan validation error:', error);
                    showToast('Terjadi kesalahan saat memvalidasi', 'error');
                }
                
                // Resume scanner after 2 seconds
                setTimeout(() => {
                    scanner.resume();
                    isScanning = false;
                }, 2000);
            },
            (error) => {
                console.warn('Scanner error:', error);
                // Don't show common errors to users
            }
        );
        
        console.log('Scanner initialized successfully');
        
    } catch (error) {
        console.error('Scanner initialization failed:', error);
        reader.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #dc3545;">
                <h3>⚠️ Gagal Memuat Scanner</h3>
                <p>${error.message}</p>
                <div style="margin-top: 20px;">
                    <button onclick="location.reload()" style="padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        🔄 Coba Lagi
                    </button>
                    <button onclick="location.href='index.html'" style="padding: 10px 20px; margin: 5px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        ← Kembali ke Data
                    </button>
                </div>
            </div>`;
    }
};

// Sound function
const playSound = (type) => {
    try {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (type === 'success') {
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        } else {
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        }
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        
    } catch (error) {
        // Fallback to silent if audio fails
        console.log('Audio playback not supported');
    }
};

// Export to CSV
const exportToCSV = () => {
    if (globalData.length === 0) {
        showToast('Tidak ada data untuk diexport', 'warning');
        return;
    }
    
    try {
        // Headers sesuai dengan sistem pendaftaran
        const headers = ['Kode', 'Nama', 'Nomor Tiket', 'Email', 'No HP', 'Tanggal Daftar'];
        
        // Format data untuk CSV
        const csvRows = [
            headers.join(','),
            ...globalData.map(user => [
                `"${(user.code || '').replace(/"/g, '""')}"`,
                `"${(user.nama || '').replace(/"/g, '""')}"`,
                `"${(user.nomorTiket || '').replace(/"/g, '""')}"`,
                `"${(user.email || '').replace(/"/g, '""')}"`,
                `"${(user.hp || '').replace(/"/g, '""')}"`,
                `"${user.createdAt}"`
            ].join(','))
        ];
        
        const csvString = csvRows.join('\n');
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `data_peserta_${new Date().toISOString().slice(0, 10)}.csv`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`📥 Data berhasil diexport (${globalData.length} peserta)`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showToast('Gagal mengexport data', 'error');
    }
};

// --- PAGE INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin page loaded');
    
    // Deteksi halaman
    const currentPage = window.location.pathname.split('/').pop();
    const isIndexPage = currentPage === 'index.html' || currentPage === '' || currentPage === 'admin.html';
    const isScanPage = currentPage === 'scan.html';
    
    if (isIndexPage) {
        console.log('Setting up index page...');
        
        // Setup event listeners
        const searchInput = getElement('searchInput');
        const sortButton = getElement('btnSort');
        
        if (searchInput) {
            searchInput.addEventListener('input', searchData);
        }
        
        if (sortButton) {
            sortButton.addEventListener('click', sortData);
        }
        
        // Add export button
        const controlsDiv = document.querySelector('.controls');
        if (controlsDiv && !getElement('btnExport')) {
            const exportBtn = document.createElement('button');
            exportBtn.id = 'btnExport';
            exportBtn.innerHTML = '📥 Export CSV';
            exportBtn.title = 'Export data ke file CSV';
            exportBtn.style.cssText = `
                padding: 10px 20px;
                background: #17a2b8;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s;
            `;
            exportBtn.onclick = exportToCSV;
            controlsDiv.appendChild(exportBtn);
        }
        
        // Initialize data table
        initializeDataTable();
        
    } else if (isScanPage) {
        console.log('Setting up scanner page...');
        
        // Initialize scanner with a slight delay
        setTimeout(() => {
            initializeScanner();
            
            // Hide loading overlay if exists
            const loadingOverlay = getElement('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }, 1000);
    }
    
    // Auto-hide loading after 10 seconds (fallback)
    setTimeout(() => {
        const loadingOverlay = getElement('loadingOverlay');
        if (loadingOverlay && loadingOverlay.style.display !== 'none') {
            loadingOverlay.style.display = 'none';
            showToast('Waktu muat terlalu lama. Periksa koneksi internet.', 'warning');
        }
    }, 10000);
});

// Global functions
window.searchData = searchData;
window.sortData = sortData;
window.exportToCSV = exportToCSV;import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, deleteDoc, doc,
    query, where, getDocs 
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const DB_COLLECTION = "peserta";

let globalData = [];

// --- UTILITY FUNCTIONS ---
const getElement = (id) => document.getElementById(id);

const showToast = (message, type = 'info') => {
    const toast = getElement('toast');
    const toastMessage = getElement('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    const colors = { success: '#28a745', error: '#dc3545', warning: '#ffc107', info: '#17a2b8' };
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    
    toast.style.background = colors[type] || colors.info;
    toastMessage.innerHTML = `${icons[type] || ''} ${message}`;
    toast.style.display = 'block';
    
    setTimeout(() => toast.style.display = 'none', 3000);
};

// --- MAIN DATA LOGIC ---
const initializeDataTable = () => {
    const tableBody = getElement('tableBody');
    if (!tableBody) return;

    // Realtime listener
    onSnapshot(collection(db, DB_COLLECTION), 
        (snapshot) => {
            globalData = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                // PASTIKAN KITA MENGGUNAKAN FIELD YANG SAMA!
                const userCode = data.code || doc.id;
                
                globalData.push({
                    id: doc.id,
                    code: userCode, // INI YANG PENTING!
                    nama: data.nama || '-',
                    nomorTiket: data.nomorTiket || '-',
                    email: data.email || '-',
                    hp: data.hp || '-',
                    createdAt: data.createdAt ? data.createdAt.toDate().toLocaleString('id-ID') : 'N/A',
                    // Simpan semua data untuk debugging
                    _rawData: data
                });
            });
            
            console.log('Data loaded:', globalData);
            renderTable(globalData);
            getElement('loadingOverlay').style.display = 'none';
        },
        (error) => {
            console.error("Error:", error);
            showToast("Gagal memuat data", 'error');
            getElement('loadingOverlay').style.display = 'none';
        }
    );
};

const renderTable = (dataArray) => {
    const tableBody = getElement('tableBody');
    if (!tableBody) return;

    tableBody.innerHTML = dataArray.length ? '' : `
        <tr><td colspan="8" style="text-align:center; padding:40px;">📭 Tidak ada data peserta</td></tr>`;
    
    dataArray.forEach(user => {
        const row = document.createElement('tr');
        
        // Pastikan kita menggunakan user.code untuk QR Code
        const qrCode = user.code;
        const qrId = `qr-${qrCode.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        row.innerHTML = `
            <td style="text-align:center; padding:15px;">
                <div id="${qrId}" class="qr-container" style="min-width:80px; min-height:80px;"></div>
                <small style="display:block; margin-top:5px; font-size:10px; color:#666;">${qrCode}</small>
            </td>
            <td><strong>${qrCode}</strong></td>
            <td>${user.nama}</td>
            <td>${user.nomorTiket}</td>
            <td>${user.email}</td>
            <td>${user.hp}</td>
            <td>${user.createdAt}</td>
            <td>
                <button class="btn-delete" data-id="${user.id}" title="Hapus">
                    🗑️
                </button>
            </td>`;
        tableBody.appendChild(row);
        
        // Generate QR Code - PASTIKAN MENGGUNAKAN user.code
        setTimeout(() => {
            const qrElem = document.getElementById(qrId);
            if (qrElem && typeof QRCode !== 'undefined') {
                try {
                    new QRCode(qrElem, {
                        text: qrCode, // INI YANG PENTING!
                        width: 80,
                        height: 80,
                        colorDark: "#2c3e50",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                } catch (error) {
                    console.error('QR Error:', error);
                    qrElem.innerHTML = `<div style="color:#dc3545;">QR Error</div>`;
                }
            }
        }, 100);
    });

    // Delete button
    tableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            if (confirm('Hapus peserta ini?')) {
                try {
                    await deleteDoc(doc(db, DB_COLLECTION, id));
                    showToast('Data dihapus', 'success');
                } catch (error) {
                    showToast('Gagal menghapus', 'error');
                }
            }
        }
    });
};

const searchData = () => {
    const term = getElement('searchInput')?.value.toLowerCase() || '';
    if (!term) return renderTable(globalData);
    
    const filtered = globalData.filter(u => 
        u.nama.toLowerCase().includes(term) ||
        u.code.toLowerCase().includes(term) ||
        u.nomorTiket.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.hp.toLowerCase().includes(term)
    );
    
    renderTable(filtered);
};

// --- SIMPLE SCANNER ---
const initializeScanner = () => {
    const reader = getElement('reader');
    if (!reader) return;
    
    reader.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Pilih Metode Scan</h3>
            <div style="margin: 20px 0;">
                <button id="btnManual" style="padding: 15px 30px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; margin: 10px;">
                    📝 Input Manual
                </button>
                <button id="btnUpload" style="padding: 15px 30px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; margin: 10px;">
                    📁 Upload Gambar QR
                </button>
                <button id="btnCamera" style="padding: 15px 30px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; margin: 10px;">
                    📷 Gunakan Kamera (Beta)
                </button>
            </div>
            
            <div id="manualSection" style="display: none; margin: 20px 0;">
                <input type="text" id="manualInput" placeholder="Masukkan kode QR/tiket" 
                       style="padding: 12px; width: 300px; border: 2px solid #ddd; border-radius: 8px;">
                <button id="btnSubmitManual" style="padding: 12px 20px; background: #007bff; color: white; border: none; border-radius: 8px;">
                    Validasi
                </button>
            </div>
            
            <div id="uploadSection" style="display: none; margin: 20px 0;">
                <input type="file" id="fileInput" accept="image/*" style="padding: 10px;">
                <div id="previewContainer" style="margin: 10px 0;"></div>
            </div>
            
            <div id="cameraSection" style="display: none; margin: 20px 0;">
                <video id="cameraView" style="width: 100%; max-width: 500px; border-radius: 10px;"></video>
                <div style="margin: 10px;">
                    <button id="btnStartCamera" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px;">
                        Mulai Kamera
                    </button>
                    <button id="btnStopCamera" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px;">
                        Stop Kamera
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Event Listeners
    document.getElementById('btnManual').addEventListener('click', () => {
        document.getElementById('manualSection').style.display = 'block';
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('cameraSection').style.display = 'none';
    });
    
    document.getElementById('btnUpload').addEventListener('click', () => {
        document.getElementById('uploadSection').style.display = 'block';
        document.getElementById('manualSection').style.display = 'none';
        document.getElementById('cameraSection').style.display = 'none';
    });
    
    document.getElementById('btnCamera').addEventListener('click', () => {
        document.getElementById('cameraSection').style.display = 'block';
        document.getElementById('manualSection').style.display = 'none';
        document.getElementById('uploadSection').style.display = 'none';
    });
    
    // Manual Validation
    document.getElementById('btnSubmitManual')?.addEventListener('click', validateManualCode);
    document.getElementById('manualInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') validateManualCode();
    });
    
    // File Upload
    document.getElementById('fileInput')?.addEventListener('change', handleFileUpload);
    
    // Camera
    document.getElementById('btnStartCamera')?.addEventListener('click', startCamera);
    document.getElementById('btnStopCamera')?.addEventListener('click', stopCamera);
    
    async function validateManualCode() {
        const code = document.getElementById('manualInput')?.value.trim();
        if (!code) {
            showToast('Masukkan kode terlebih dahulu', 'warning');
            return;
        }
        
        await validateQRCode(code);
    }
    
    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            const img = new Image();
            img.onload = function() {
                // Preview image
                const preview = document.getElementById('previewContainer');
                preview.innerHTML = `<img src="${e.target.result}" style="max-width: 300px; border-radius: 5px;">`;
                
                // Try to decode with jsQR if available
                if (typeof jsQR === 'function') {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imageData.data, imageData.width, imageData.height);
                        
                        if (code) {
                            validateQRCode(code.data);
                        } else {
                            showToast('Tidak dapat membaca QR Code dari gambar', 'error');
                        }
                    } catch (error) {
                        showToast('Error membaca gambar: ' + error.message, 'error');
                    }
                } else {
                    showToast('Library QR scanner tidak tersedia', 'warning');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    let cameraStream = null;
    
    async function startCamera() {
        try {
            const video = document.getElementById('cameraView');
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            video.srcObject = cameraStream;
            video.play();
            
            showToast('Kamera berhasil diaktifkan', 'success');
        } catch (error) {
            showToast('Gagal mengakses kamera: ' + error.message, 'error');
        }
    }
    
    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
            document.getElementById('cameraView').srcObject = null;
        }
    }
    
    async function validateQRCode(code) {
        try {
            const q = query(collection(db, DB_COLLECTION), where("code", "==", code));
            const snapshot = await getDocs(q);
            
            const resultDiv = getElement('scanResult');
            if (!resultDiv) return;
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const user = doc.data();
                
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div style="background: #d4edda; padding: 25px; border-radius: 15px; border-left: 5px solid #28a745;">
                        <h3 style="color: #155724; margin-bottom: 15px;">
                            ✅ TIKET VALID - BOLEH MASUK
                        </h3>
                        <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                            <p><strong>👤 Nama:</strong> ${user.nama || '-'}</p>
                            <p><strong>🔢 Kode:</strong> <code style="background: #f8f9fa; padding: 3px 8px; border-radius: 4px;">${code}</code></p>
                            <p><strong>🎫 No. Tiket:</strong> ${user.nomorTiket || '-'}</p>
                            <p><strong>📧 Email:</strong> ${user.email || '-'}</p>
                            <p><strong>📱 No. HP:</strong> ${user.hp || '-'}</p>
                        </div>
                        <div style="text-align: center; color: #0c5460; font-size: 14px;">
                            <i>Waktu validasi: ${new Date().toLocaleTimeString('id-ID')}</i>
                        </div>
                    </div>
                `;
                
            } else {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div style="background: #f8d7da; padding: 25px; border-radius: 15px; border-left: 5px solid #dc3545;">
                        <h3 style="color: #721c24; margin-bottom: 15px;">
                            ❌ TIKET TIDAK VALID
                        </h3>
                        <div style="background: white; padding: 20px; border-radius: 10px;">
                            <p>Kode yang discan: <code style="background: #f8f9fa; padding: 3px 8px; border-radius: 4px;">${code}</code></p>
                            <p style="color: #666; margin-top: 10px;">
                                <i>⚠️ Kode tidak ditemukan dalam database peserta.</i>
                            </p>
                        </div>
                    </div>
                `;
            }
            
            // Auto-hide setelah 5 detik
            setTimeout(() => {
                resultDiv.style.display = 'none';
            }, 5000);
            
        } catch (error) {
            console.error('Validation error:', error);
            showToast('Error memvalidasi tiket', 'error');
        }
    }
};

// --- PAGE INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const isAdminPage = path.includes('admin/index.html') || (path.includes('admin/') && !path.includes('scan.html'));
    const isScanPage = path.includes('scan.html');
    
    if (isAdminPage) {
        initializeDataTable();
        
        const searchInput = getElement('searchInput');
        const sortButton = getElement('btnSort');
        
        if (searchInput) searchInput.addEventListener('input', searchData);
        if (sortButton) sortButton.addEventListener('click', () => {
            globalData.sort((a, b) => a.nama.localeCompare(b.nama));
            renderTable(globalData);
        });
        
    } else if (isScanPage) {
        // Load jsQR untuk scan gambar
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
        document.head.appendChild(script);
        
        setTimeout(initializeScanner, 1000);
    }
});

// Global functions
window.searchData = searchData;
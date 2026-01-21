import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, query, where, getDocs, 
    deleteDoc, doc, onSnapshot, orderBy 
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

// Inisialisasi
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const DB_COLLECTION = "peserta";

let globalData = [];

// --- UTILITY FUNCTIONS ---
const getElement = (id) => document.getElementById(id);

// Fungsi untuk membersihkan ID element (mengganti karakter non-alphanumeric dengan underscore)
const cleanElementId = (str) => {
    return str.replace(/[^a-zA-Z0-9]/g, '_');
};

// Fungsi untuk menampilkan notifikasi
const showToast = (message, type = 'info') => {
    const toast = getElement('toast');
    const toastMessage = getElement('toastMessage');
    
    if (!toast || !toastMessage) {
        // Buat toast jika belum ada
        const newToast = document.createElement('div');
        newToast.id = 'toast';
        newToast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        newToast.innerHTML = '<span id="toastMessage"></span>';
        document.body.appendChild(newToast);
    }
    
    const finalToast = getElement('toast') || newToast;
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
    if (!tableBody) return;

    // Sembunyikan loading setelah 1 detik
    setTimeout(() => {
        const loadingOverlay = getElement('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }, 1000);

    // Realtime listener untuk data peserta
    onSnapshot(collection(db, DB_COLLECTION), (snapshot) => {
        globalData = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            globalData.push({
                id: doc.id,
                code: data.code || data.kode || '-',
                nama: data.nama || data.name || '-',
                // Gunakan code sebagai nomorTiket jika tidak ada field nomorTiket
                nomorTiket: data.nomorTiket || data.code || '-',
                email: data.email || data.Email || '-',
                hp: data.hp || data.phone || data.noHP || '-',
                createdAt: data.createdAt || data.timestamp || new Date().toISOString()
            });
        });
        
        // Urutkan berdasarkan nama
        globalData.sort((a, b) => a.nama.localeCompare(b.nama));
        
        renderTable(globalData);
        
        // Sembunyikan loading
        const loadingOverlay = getElement('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        
    }, (error) => {
        console.error("Error loading data:", error);
        showToast("Gagal memuat data dari database", 'error');
        const loadingOverlay = getElement('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    });
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
                    <p style="margin-top: 10px; color: #999;">Tambahkan peserta terlebih dahulu</p>
                </td>
            </tr>`;
        return;
    }
    
    dataArray.forEach(user => {
        const cleanCode = cleanElementId(user.code);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="text-align:center;">
                <div id="qr-table-${cleanCode}" class="qr-container"></div>
            </td>
            <td><b>${user.code}</b></td>
            <td>${user.nama}</td>
            <td>${user.nomorTiket}</td>
            <td><a href="mailto:${user.email}" style="color: #007bff; text-decoration: none;">${user.email}</a></td>
            <td><a href="tel:${user.hp}" style="color: #007bff; text-decoration: none;">${user.hp}</a></td>
            <td>
                <button class="btn-delete" data-id="${user.id}" title="Hapus peserta ${user.nama}">
                    🗑️ Hapus
                </button>
            </td>`;
        tableBody.appendChild(row);
    });

    // Generate QR Code untuk setiap peserta
    setTimeout(() => {
        dataArray.forEach(user => {
            const cleanCode = cleanElementId(user.code);
            const qrElem = getElement(`qr-table-${cleanCode}`);
            if (qrElem && !qrElem.hasChildNodes()) {
                try {
                    new QRCode(qrElem, {
                        text: user.code, // Menggunakan field 'code' untuk QR
                        width: 60,
                        height: 60,
                        colorDark: "#2c3e50",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                } catch (error) {
                    console.error("Error generating QR code for", user.code, error);
                }
            }
        });
    }, 100);

    // Event delegation untuk tombol hapus
    tableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            const row = e.target.closest('tr');
            const userName = row ? row.querySelector('td:nth-child(3)').textContent : 'peserta';
            
            if (confirm(`Yakin ingin menghapus peserta "${userName}"?`)) {
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

// Fungsi pencarian dengan debounce
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
            (user.nomorTiket && user.nomorTiket.toLowerCase().includes(term)) ||
            (user.email && user.email.toLowerCase().includes(term)) ||
            (user.hp && user.hp.toLowerCase().includes(term))
        );
        
        renderTable(filtered);
        
        if (filtered.length === 0) {
            showToast(`Tidak ditemukan hasil untuk "${term}"`, 'warning');
        }
    }, 300);
};

let currentSortOrder = 'asc';
const sortData = () => {
    if (globalData.length === 0) return;
    
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    
    globalData.sort((a, b) => {
        const nameA = a.nama.toLowerCase();
        const nameB = b.nama.toLowerCase();
        if (currentSortOrder === 'asc') {
            return nameA.localeCompare(nameB);
        } else {
            return nameB.localeCompare(nameA);
        }
    });
    
    const sortButton = getElement('btnSort');
    if (sortButton) {
        sortButton.textContent = currentSortOrder === 'asc' ? 'Urutkan Z-A' : 'Urutkan A-Z';
        sortButton.title = `Klik untuk mengurutkan ${currentSortOrder === 'asc' ? 'Z ke A' : 'A ke Z'}`;
    }
    
    renderTable(globalData);
    showToast(`Data diurutkan ${currentSortOrder === 'asc' ? 'A-Z' : 'Z-A'}`, 'info');
};

// --- SCANNER LOGIC ---
const initializeScanner = () => {
    const reader = getElement('reader');
    if (!reader) return;
    
    // Clear previous content
    reader.innerHTML = '';
    
    // Check if Html5QrcodeScanner is available
    if (typeof Html5QrcodeScanner === 'undefined') {
        reader.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #dc3545;">
                <h3>⚠️ Scanner Library Tidak Terload</h3>
                <p>Silakan refresh halaman atau cek koneksi internet.</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px;">
                    🔄 Refresh Halaman
                </button>
            </div>`;
        return;
    }
    
    try {
        // Create scanner instance
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
        
        let isProcessing = false;
        
        const onScanSuccess = async (decodedText) => {
            if (isProcessing) return;
            isProcessing = true;
            
            try {
                // Pause scanner temporarily
                scanner.pause();
                
                const scanCode = decodedText.trim();
                console.log('QR Code scanned:', scanCode);
                
                // Query untuk mencari data berdasarkan 'code'
                const q = query(
                    collection(db, DB_COLLECTION), 
                    where("code", "==", scanCode)
                );
                
                const querySnapshot = await getDocs(q);
                
                const resultDiv = getElement('scanResult');
                if (!resultDiv) return;
                
                if (!querySnapshot.empty) {
                    // Data ditemukan
                    const doc = querySnapshot.docs[0];
                    const user = doc.data();
                    
                    resultDiv.style.display = 'block';
                    resultDiv.innerHTML = `
                        <div style="background: linear-gradient(135deg, #d4edda, #c3e6cb); padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                                <div style="background: #28a745; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                                    ✅
                                </div>
                                <div>
                                    <h3 style="margin: 0; color: #155724;">DATA VALID</h3>
                                    <p style="margin: 5px 0 0 0; color: #0c5460;">Waktu: ${new Date().toLocaleTimeString('id-ID')}</p>
                                </div>
                            </div>
                            
                            <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                                <p><strong>👤 Nama:</strong> ${user.nama || '-'}</p>
                                <p><strong>🔢 Kode:</strong> <code style="background: #f8f9fa; padding: 3px 8px; border-radius: 4px;">${scanCode}</code></p>
                                <p><strong>🎫 No. Tiket:</strong> ${user.nomorTiket || user.code || '-'}</p>
                                <p><strong>📧 Email:</strong> ${user.email || '-'}</p>
                                <p><strong>📱 No. HP:</strong> ${user.hp || '-'}</p>
                            </div>
                            
                            <div style="text-align: center; padding: 10px; background: #28a745; color: white; border-radius: 8px;">
                                <strong>✅ PESERTA TERVERIFIKASI - BOLEH MASUK</strong>
                            </div>
                        </div>
                    `;
                    
                    // Play success sound
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
                                    <h3 style="margin: 0; color: #721c24;">DATA TIDAK DITEMUKAN</h3>
                                    <p style="margin: 5px 0 0 0; color: #856404;">Waktu: ${new Date().toLocaleTimeString('id-ID')}</p>
                                </div>
                            </div>
                            
                            <div style="background: white; padding: 20px; border-radius: 10px;">
                                <p><strong>Kode yang discan:</strong></p>
                                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; margin: 10px 0;">
                                    <code style="font-size: 18px; color: #dc3545;">${scanCode}</code>
                                </div>
                                <p style="color: #666; font-size: 0.9em; margin-top: 15px;">
                                    <i>⚠️ Pastikan QR Code sesuai dengan database peserta.</i>
                                </p>
                            </div>
                            
                            <div style="text-align: center; padding: 10px; background: #dc3545; color: white; border-radius: 8px; margin-top: 15px;">
                                <strong>❌ DATA TIDAK VALID - TIDAK BOLEH MASUK</strong>
                            </div>
                        </div>
                    `;
                    
                    // Play error sound
                    playSound('error');
                }
                
                // Auto-hide result after 5 seconds
                setTimeout(() => {
                    resultDiv.style.display = 'none';
                    resultDiv.innerHTML = '';
                }, 5000);
                
                // Resume scanner after 2 seconds
                setTimeout(() => {
                    scanner.resume();
                    isProcessing = false;
                }, 2000);
                
            } catch (error) {
                console.error('Scan error:', error);
                showToast('Terjadi kesalahan saat memvalidasi QR Code', 'error');
                scanner.resume();
                isProcessing = false;
            }
        };
        
        const onScanError = (error) => {
            // Only log the error, don't show to user
            console.warn('QR Scanner error:', error);
        };
        
        // Render the scanner
        scanner.render(onScanSuccess, onScanError);
        
        // Add instructions
        const instructionDiv = document.createElement('div');
        instructionDiv.style.cssText = `
            text-align: center;
            margin-top: 20px;
            color: #666;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
        `;
        instructionDiv.innerHTML = `
            <p style="margin: 0 0 10px 0;"><strong>📱 Cara menggunakan:</strong></p>
            <p style="margin: 5px 0; font-size: 0.9em;">1. Arahkan kamera ke QR Code peserta</p>
            <p style="margin: 5px 0; font-size: 0.9em;">2. Pastikan QR Code berada dalam kotak scanner</p>
            <p style="margin: 5px 0; font-size: 0.9em;">3. Tunggu hingga terdeteksi secara otomatis</p>
        `;
        reader.parentNode.appendChild(instructionDiv);
        
    } catch (error) {
        console.error('Scanner initialization failed:', error);
        reader.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #dc3545;">
                <h3>❌ GAGAL MEMUAT SCANNER</h3>
                <p>Error: ${error.message}</p>
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
        const audio = new Audio();
        audio.volume = 0.3;
        
        if (type === 'success') {
            // Short beep for success
            audio.src = 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3';
        } else {
            // Error sound
            audio.src = 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3';
        }
        
        audio.play().catch(e => console.log('Audio play failed (normal):', e));
    } catch (e) {
        // Ignore audio errors
    }
};

// --- EXPORT FUNCTION ---
const exportToCSV = () => {
    if (globalData.length === 0) {
        showToast('Tidak ada data untuk diexport', 'warning');
        return;
    }
    
    try {
        const headers = ['Kode', 'Nama', 'Nomor Tiket', 'Email', 'No HP', 'Tanggal Daftar'];
        const csvRows = [
            headers.join(','),
            ...globalData.map(user => [
                `"${(user.code || '').replace(/"/g, '""')}"`,
                `"${(user.nama || '').replace(/"/g, '""')}"`,
                `"${(user.nomorTiket || '').replace(/"/g, '""')}"`,
                `"${(user.email || '').replace(/"/g, '""')}"`,
                `"${(user.hp || '').replace(/"/g, '""')}"`,
                `"${new Date(user.createdAt).toLocaleDateString('id-ID')}"`
            ].join(','))
        ];
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `peserta_${new Date().toISOString().slice(0, 10)}.csv`;
        link.style.visibility = 'hidden';
        
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
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'index.html' || currentPage === '') {
        // Index page
        initializeDataTable();
        
        // Setup event listeners
        const searchInput = getElement('searchInput');
        const sortButton = getElement('btnSort');
        
        if (searchInput) {
            searchInput.addEventListener('input', searchData);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchData();
                }
            });
        }
        
        if (sortButton) {
            sortButton.addEventListener('click', sortData);
        }
        
        // Add export button if not exists
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
        
    } else if (currentPage === 'scan.html') {
        // Scan page - initialize scanner
        setTimeout(() => {
            initializeScanner();
        }, 1000);
    }
});

// Global functions
window.searchData = searchData;
window.sortData = sortData;
window.exportToCSV = exportToCSV;
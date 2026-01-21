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

// Inisialisasi hanya sekali
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const DB_COLLECTION = "peserta";

// --- Cache DOM Elements ---
let cachedElements = {};
let globalData = [];
let currentSortOrder = 'asc';

// --- UTILITY FUNCTIONS ---
const getElement = (id) => {
    if (!cachedElements[id]) {
        cachedElements[id] = document.getElementById(id);
    }
    return cachedElements[id];
};

const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Format data untuk menghandle field yang mungkin kosong
const formatUserData = (doc) => {
    const data = doc.data();
    return {
        id: doc.id,
        code: data.code || data.kode || data.id || '-',
        nama: data.nama || data.name || '-',
        nomorTiket: data.nomorTiket || data.nomorId || data.ticket || '-',
        email: data.email || data.Email || '-',
        hp: data.hp || data.phone || data.noHP || data.telp || '-',
        timestamp: data.timestamp || data.createdAt || new Date().toISOString()
    };
};

// --- MAIN DATA LOGIC ---
const initializeDataTable = () => {
    const tableBody = getElement('tableBody');
    if (!tableBody) return;

    // Tampilkan loading
    const loadingOverlay = getElement('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    // Realtime listener dengan optimasi
    const unsubscribe = onSnapshot(
        query(collection(db, DB_COLLECTION)), 
        (snapshot) => {
            globalData = snapshot.docs.map(formatUserData);
            
            // Sortir data berdasarkan nama
            globalData.sort((a, b) => a.nama.localeCompare(b.nama));
            
            renderTable(globalData);
            
            // Sembunyikan loading
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        },
        (error) => {
            console.error("Error listening to data:", error);
            alert("Gagal memuat data. Silakan refresh halaman.");
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    );

    // Cleanup listener saat halaman ditutup
    window.addEventListener('beforeunload', () => unsubscribe());
};

const renderTable = (dataArray) => {
    const tableBody = getElement('tableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    if (dataArray.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i>Tidak ada data peserta</i>
                </td>
            </tr>`;
        return;
    }

    // Gunakan DocumentFragment untuk batch rendering
    const fragment = document.createDocumentFragment();
    
    dataArray.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="text-align:center;">
                <div id="qr-table-${user.code.replace(/[^a-zA-Z0-9]/g, '-')}" class="qr-container"></div>
            </td>
            <td><b>${user.code}</b></td>
            <td>${user.nama}</td>
            <td>${user.nomorTiket}</td>
            <td><a href="mailto:${user.email}" title="Kirim email ke ${user.nama}">${user.email}</a></td>
            <td>${user.hp}</td>
            <td>
                <button class="btn-delete" data-id="${user.id}" aria-label="Hapus ${user.nama}">
                    Hapus
                </button>
            </td>`;
        fragment.appendChild(row);
    });
    
    tableBody.appendChild(fragment);

    // Generate QR codes setelah rendering selesai
    setTimeout(() => {
        dataArray.forEach(user => {
            const safeId = user.code.replace(/[^a-zA-Z0-9]/g, '-');
            const qrElem = getElement(`qr-table-${safeId}`);
            if (qrElem && !qrElem.hasChildNodes()) {
                try {
                    new QRCode(qrElem, {
                        text: user.code,
                        width: 60,
                        height: 60,
                        colorDark: "#2c3e50",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                } catch (error) {
                    console.error("Error generating QR for", user.code, error);
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
                    e.target.textContent = 'Menghapus...';
                    await deleteDoc(doc(db, DB_COLLECTION, id));
                    
                    // Tampilkan notifikasi sukses
                    showToast(`Data "${userName}" berhasil dihapus`, 'success');
                } catch (error) {
                    console.error("Delete error:", error);
                    showToast(`Gagal menghapus: ${error.message}`, 'error');
                    e.target.disabled = false;
                    e.target.textContent = 'Hapus';
                }
            }
        }
    });
};

const searchData = debounce(() => {
    const searchInput = getElement('searchInput');
    if (!searchInput || globalData.length === 0) return;
    
    const term = searchInput.value.trim().toLowerCase();
    
    if (term.length === 0) {
        renderTable(globalData);
        return;
    }
    
    if (term.length < 2) return; // Minimal 2 karakter
    
    const filtered = globalData.filter(u => 
        (u.nama && u.nama.toLowerCase().includes(term)) || 
        (u.code && u.code.toLowerCase().includes(term)) ||
        (u.nomorTiket && u.nomorTiket.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.hp && u.hp.toLowerCase().includes(term))
    );
    
    renderTable(filtered);
}, 300);

const sortData = () => {
    if (globalData.length === 0) return;
    
    const sortButton = getElement('btnSort');
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    
    globalData.sort((a, b) => {
        const compare = (a.nama || '').localeCompare(b.nama || '');
        return currentSortOrder === 'asc' ? compare : -compare;
    });
    
    if (sortButton) {
        sortButton.textContent = currentSortOrder === 'asc' ? 'Urutkan Z-A' : 'Urutkan A-Z';
        sortButton.title = currentSortOrder === 'asc' ? 'Klik untuk urutkan dari Z ke A' : 'Klik untuk urutkan dari A ke Z';
    }
    
    renderTable(globalData);
};

// --- SCANNER LOGIC ---
const initializeScanner = () => {
    const reader = getElement('reader');
    if (!reader || typeof Html5QrcodeScanner === 'undefined') {
        console.error("Scanner library not loaded or element not found");
        return;
    }
    
    let scanner = null;
    let isScanning = false;
    
    const onScanSuccess = async (decodedText) => {
        if (isScanning) return; // Prevent multiple scans
        isScanning = true;
        
        try {
            // Clean the scanned code
            const scannedCode = decodedText.trim();
            console.log("Scanned code:", scannedCode);
            
            // Query dengan beberapa kemungkinan field
            const queries = [
                query(collection(db, DB_COLLECTION), where("code", "==", scannedCode)),
                query(collection(db, DB_COLLECTION), where("kode", "==", scannedCode)),
                query(collection(db, DB_COLLECTION), where("nomorTiket", "==", scannedCode))
            ];
            
            let user = null;
            let userDoc = null;
            
            // Coba semua query
            for (const q of queries) {
                const snap = await getDocs(q);
                if (!snap.empty) {
                    userDoc = snap.docs[0];
                    user = formatUserData(userDoc);
                    break;
                }
            }
            
            const resultDiv = getElement('scanResult');
            if (!resultDiv) return;
            
            if (user) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <h3 style="color: #28a745; display: flex; align-items: center; gap: 8px;">
                        <span>✅</span> Data Valid!
                    </h3>
                    <p><strong>Nama:</strong> ${user.nama}</p>
                    <p><strong>Kode:</strong> ${user.code}</p>
                    <p><strong>Nomor Tiket:</strong> ${user.nomorTiket}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Waktu Scan:</strong> ${new Date().toLocaleTimeString('id-ID')}</p>
                    <div style="margin-top: 15px; padding: 10px; background: #e8f5e9; border-radius: 5px;">
                        <small><i>✅ Peserta terverifikasi dan dapat masuk</i></small>
                    </div>
                `;
                resultDiv.style.borderColor = '#28a745';
                resultDiv.style.backgroundColor = '#f0fff4';
                
                // Audio feedback (opsional)
                try {
                    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
                    audio.volume = 0.3;
                    audio.play().catch(e => console.log("Audio play failed:", e));
                } catch (e) {
                    console.log("Audio error:", e);
                }
                
                // Update status kehadiran di database (opsional)
                try {
                    // Anda bisa menambahkan field 'scannedAt' untuk melacak kapan QR discan
                    console.log("User verified:", user.nama);
                } catch (updateError) {
                    console.error("Failed to update scan time:", updateError);
                }
                
            } else {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <h3 style="color: #dc3545; display: flex; align-items: center; gap: 8px;">
                        <span>❌</span> Data Tidak Ditemukan!
                    </h3>
                    <p>Kode QR yang discan: <code style="background: #f8d7da; padding: 2px 5px; border-radius: 3px;">${scannedCode}</code></p>
                    <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                        <i>Pastikan kode QR sesuai dengan data di database.</i>
                    </p>
                `;
                resultDiv.style.borderColor = '#dc3545';
                resultDiv.style.backgroundColor = '#f8d7da';
                
                // Audio error
                try {
                    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3');
                    audio.volume = 0.3;
                    audio.play().catch(e => console.log("Audio play failed:", e));
                } catch (e) {
                    console.log("Audio error:", e);
                }
            }
            
            // Auto-hide result setelah 5 detik
            setTimeout(() => {
                if (resultDiv) {
                    resultDiv.style.display = 'none';
                    resultDiv.innerHTML = '';
                }
            }, 5000);
            
            // Reset scanning setelah 2 detik
            setTimeout(() => {
                isScanning = false;
                if (scanner) {
                    scanner.resume();
                }
            }, 2000);
            
        } catch (error) {
            console.error("Scan error:", error);
            showToast("Terjadi kesalahan saat memvalidasi QR Code", 'error');
            isScanning = false;
        }
    };
    
    const onScanError = (error) => {
        console.warn("Scan error:", error);
        // Hanya tampilkan error jika bukan error biasa seperti 'NotFoundException'
        if (!error.message?.includes('NotFoundException')) {
            showToast(`Error scanner: ${error.message || 'Unknown error'}`, 'warning');
        }
    };
    
    // Inisialisasi scanner
    try {
        scanner = new Html5QrcodeScanner(
            "reader", 
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
            },
            false
        );
        scanner.render(onScanSuccess, onScanError);
        
        // Cleanup saat halaman ditutup
        window.addEventListener('beforeunload', () => {
            if (scanner) {
                scanner.clear().catch(e => console.log("Scanner cleanup:", e));
            }
        });
    } catch (error) {
        console.error("Scanner initialization failed:", error);
        reader.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc3545; background: #f8d7da; border-radius: 10px;">
                <h3>⚠️ Scanner tidak dapat dijalankan</h3>
                <p>Kemungkinan penyebab:</p>
                <ul style="text-align: left; display: inline-block; margin: 10px auto;">
                    <li>Kamera tidak tersedia</li>
                    <li>Izin kamera belum diberikan</li>
                    <li>Browser tidak mendukung</li>
                </ul>
                <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 15px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    🔄 Coba Lagi
                </button>
            </div>
        `;
    }
};

// --- TOAST NOTIFICATION ---
const showToast = (message, type = 'info') => {
    const toast = getElement('toast');
    const toastMessage = getElement('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    // Set warna berdasarkan type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    toast.style.background = colors[type] || colors.info;
    toastMessage.textContent = message;
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    
    // Tambahkan icon berdasarkan type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toastMessage.innerHTML = `${icons[type] || ''} ${message}`;
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
};

// --- PAGE INITIALIZATION ---
const initializePage = () => {
    // Cek halaman yang sedang aktif
    const activeNav = document.querySelector('nav a.active');
    if (!activeNav) return;
    
    const currentPage = activeNav.getAttribute('href');
    
    if (currentPage.includes('index.html')) {
        initializeDataTable();
        
        // Setup event listeners untuk index.html
        const searchInput = getElement('searchInput');
        const sortButton = getElement('btnSort');
        
        if (searchInput) {
            searchInput.addEventListener('input', searchData);
            searchInput.setAttribute('autocomplete', 'off');
        }
        
        if (sortButton) {
            sortButton.addEventListener('click', sortData);
            sortButton.title = 'Klik untuk mengurutkan data berdasarkan nama';
        }
        
        // Export data button
        const controlsDiv = document.querySelector('.controls');
        if (controlsDiv && !getElement('btnExport')) {
            const exportButton = document.createElement('button');
            exportButton.textContent = '📥 Export CSV';
            exportButton.id = 'btnExport';
            exportButton.style.cssText = `
                padding: 10px 20px;
                background-color: #17a2b8;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                margin-left: 10px;
                transition: all 0.3s;
            `;
            exportButton.onclick = exportToCSV;
            exportButton.title = 'Export data ke file CSV';
            controlsDiv.appendChild(exportButton);
        }
        
    } else if (currentPage.includes('scan.html')) {
        // Periksa izin kamera sebelum inisialisasi scanner
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            initializeScanner();
        } else {
            const reader = getElement('reader');
            if (reader) {
                reader.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #dc3545;">
                        <h3>⚠️ Browser tidak mendukung akses kamera</h3>
                        <p>Silakan gunakan browser modern seperti Chrome, Firefox, atau Edge.</p>
                    </div>
                `;
            }
        }
    }
    
    // Inisialisasi tooltips
    initializeTooltips();
};

// --- EXPORT FUNCTION ---
const exportToCSV = () => {
    if (globalData.length === 0) {
        showToast('Tidak ada data untuk diexport', 'warning');
        return;
    }
    
    try {
        // Header dengan field yang sesuai
        const headers = ['Kode', 'Nama', 'Nomor Tiket', 'Email', 'No HP', 'Tanggal Daftar'];
        
        // Format data untuk CSV
        const csvRows = [
            headers.join(','),
            ...globalData.map(user => {
                return [
                    `"${user.code.replace(/"/g, '""')}"`,
                    `"${user.nama.replace(/"/g, '""')}"`,
                    `"${user.nomorTiket.replace(/"/g, '""')}"`,
                    `"${user.email.replace(/"/g, '""')}"`,
                    `"${user.hp.replace(/"/g, '""')}"`,
                    `"${new Date(user.timestamp).toLocaleDateString('id-ID')}"`
                ].join(',');
            })
        ];
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `peserta_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Data berhasil diexport (${globalData.length} peserta)`, 'success');
    } catch (error) {
        console.error("Export error:", error);
        showToast('Gagal mengexport data: ' + error.message, 'error');
    }
};

// --- TOOLTIP INITIALIZATION ---
const initializeTooltips = () => {
    // Tambahkan tooltip untuk elemen yang membutuhkan
    const elementsWithTitle = document.querySelectorAll('[title]');
    elementsWithTitle.forEach(el => {
        el.addEventListener('mouseenter', (e) => {
            const title = e.target.getAttribute('title');
            if (title) {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = title;
                tooltip.style.cssText = `
                    position: fixed;
                    background: #333;
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index:
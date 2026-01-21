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

// --- MAIN DATA LOGIC ---
const initializeDataTable = () => {
    const tableBody = getElement('tableBody');
    if (!tableBody) return;

    // Realtime listener dengan optimasi
    const unsubscribe = onSnapshot(
        query(collection(db, DB_COLLECTION), orderBy('nama')), 
        (snapshot) => {
            globalData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                timestamp: doc.data().timestamp || new Date().toISOString()
            }));
            renderTable(globalData);
        },
        (error) => {
            console.error("Error listening to data:", error);
            alert("Gagal memuat data. Silakan refresh halaman.");
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
                <div id="qr-table-${user.code}" class="qr-container"></div>
            </td>
            <td><b>${user.code}</b></td>
            <td>${user.nama}</td>
            <td>${user.nomorTiket || '-'}</td>
            <td><a href="mailto:${user.email}">${user.email}</a></td>
            <td><a href="tel:${user.hp}">${user.hp || '-'}</a></td>
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
            const qrElem = getElement(`qr-table-${user.code}`);
            if (qrElem && !qrElem.hasChildNodes()) {
                new QRCode(qrElem, {
                    text: user.code,
                    width: 60,
                    height: 60,
                    colorDark: "#2c3e50",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
        });
    }, 100);

    // Event delegation untuk tombol hapus
    tableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            const userName = e.target.closest('tr').querySelector('td:nth-child(3)').textContent;
            
            if (confirm(`Yakin ingin menghapus peserta "${userName}"?`)) {
                try {
                    e.target.disabled = true;
                    e.target.textContent = 'Menghapus...';
                    await deleteDoc(doc(db, DB_COLLECTION, id));
                } catch (error) {
                    console.error("Delete error:", error);
                    alert("Gagal menghapus: " + error.message);
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
    
    if (term.length < 2 && term.length > 0) return; // Minimal 2 karakter
    
    const filtered = globalData.filter(u => 
        u.nama.toLowerCase().includes(term) || 
        u.code.toLowerCase().includes(term) ||
        (u.nomorId && u.nomorId.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term))
    );
    
    renderTable(filtered);
}, 300);

const sortData = () => {
    if (globalData.length === 0) return;
    
    const sortButton = getElement('btnSort');
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    
    globalData.sort((a, b) => {
        const compare = a.nama.localeCompare(b.nama);
        return currentSortOrder === 'asc' ? compare : -compare;
    });
    
    sortButton.textContent = currentSortOrder === 'asc' ? 'Urutkan Z-A' : 'Urutkan A-Z';
    renderTable(globalData);
};

// --- SCANNER LOGIC ---
const initializeScanner = () => {
    const reader = getElement('reader');
    if (!reader || typeof Html5QrcodeScanner === 'undefined') return;
    
    let scanner = null;
    let isScanning = false;
    
    const onScanSuccess = async (decodedText) => {
        if (isScanning) return; // Prevent multiple scans
        isScanning = true;
        
        try {
            const q = query(
                collection(db, DB_COLLECTION), 
                where("code", "==", decodedText.trim())
            );
            const snap = await getDocs(q);
            
            const resultDiv = getElement('scanResult');
            if (!resultDiv) return;
            
            if (!snap.empty) {
                const user = snap.docs[0].data();
                resultDiv.style.display = 'block';
                getElement('resNama').textContent = user.nama;
                getElement('resKode').textContent = user.code;
                
                // Sukses visual feedback
                resultDiv.style.borderColor = '#28a745';
                resultDiv.style.backgroundColor = '#d4edda';
                
                // Audio feedback (opsional)
                try {
                    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
                    audio.volume = 0.3;
                    await audio.play();
                } catch (e) {}
                
                console.log("Data valid:", user.nama);
            } else {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <h3 style="color: #dc3545;">❌ Data Tidak Ditemukan!</h3>
                    <p>Kode QR: <strong>${decodedText}</strong></p>
                `;
                resultDiv.style.borderColor = '#dc3545';
                resultDiv.style.backgroundColor = '#f8d7da';
                
                // Audio error
                try {
                    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3');
                    audio.volume = 0.3;
                    await audio.play();
                } catch (e) {}
            }
            
            // Reset scanning setelah 2 detik
            setTimeout(() => {
                isScanning = false;
                if (scanner) {
                    scanner.resume();
                }
            }, 2000);
            
        } catch (error) {
            console.error("Scan error:", error);
            alert("Terjadi kesalahan saat memvalidasi QR Code");
            isScanning = false;
        }
    };
    
    const onScanError = (error) => {
        console.warn("Scan error:", error);
        // Tidak perlu alert untuk error biasa
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
                showZoomSliderIfSupported: true
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
            <div style="text-align: center; padding: 20px; color: #dc3545;">
                <h3>Scanner tidak dapat dijalankan</h3>
                <p>Pastikan kamera tersedia dan izin diberikan.</p>
                <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px;">
                    Coba Lagi
                </button>
            </div>
        `;
    }
};

// --- PAGE INITIALIZATION ---
const initializePage = () => {
    // Cek halaman yang sedang aktif
    const currentPage = document.querySelector('nav a.active').getAttribute('href');
    
    if (currentPage === 'index.html' || currentPage === 'index.html') {
        initializeDataTable();
        
        // Setup event listeners untuk index.html
        const searchInput = getElement('searchInput');
        const sortButton = getElement('btnSort');
        
        if (searchInput) {
            searchInput.addEventListener('input', searchData);
        }
        
        if (sortButton) {
            sortButton.addEventListener('click', sortData);
        }
        
        // Export data button (opsional tambahan)
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
        `;
        exportButton.onclick = exportToCSV;
        
        const controlsDiv = document.querySelector('.controls');
        if (controlsDiv) {
            controlsDiv.appendChild(exportButton);
        }
        
    } else if (currentPage === 'scan.html') {
        initializeScanner();
    }
};

// --- EXPORT FUNCTION ---
const exportToCSV = () => {
    if (globalData.length === 0) {
        alert('Tidak ada data untuk diexport');
        return;
    }
    
    const headers = ['Kode', 'Nama', 'NomorTiket', 'Email', 'No HP', 'Tanggal Daftar'];
    const csvData = [
        headers.join(','),
        ...globalData.map(item => [
            `"${item.code}"`,
            `"${item.nama}"`,
            `"${item.nomorTiket || ''}"`,
            `"${item.email}"`,
            `"${item.hp || ''}"`,
            `"${new Date(item.timestamp).toLocaleDateString('id-ID')}"`
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `peserta_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- LOAD EVENT ---
document.addEventListener('DOMContentLoaded', initializePage);

// Expose functions untuk akses global (jika diperlukan)
window.searchData = searchData;
window.sortData = sortData;
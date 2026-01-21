import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, deleteDoc, doc,
    query, where, getDocs, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ======================
// KONFIGURASI FIREBASE
// ======================
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

// ======================
// LOAD DATA PESERTA
// ======================
function loadData() {
    const loadingDiv = document.getElementById('loadingData');
    const table = document.getElementById('dataTable');
    const tableBody = document.getElementById('tableBody');
    
    // Tampilkan loading
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (table) table.style.display = 'none';
    
    // Realtime listener untuk data
    onSnapshot(collection(db, DB_COLLECTION), 
        (snapshot) => {
            globalData = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                globalData.push({
                    id: doc.id,
                    code: data.code || '-',
                    nama: data.nama || '-',
                    nomorTiket: data.nomorTiket || '-',
                    email: data.email || '-',
                    hp: data.hp || '-',
                    createdAt: data.createdAt ? 
                        data.createdAt.toDate().toLocaleString('id-ID') : 'N/A'
                });
            });
            
            // Update stats
            updateStats(globalData);
            
            // Render tabel
            renderTable(globalData);
            
            // Sembunyikan loading
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (table) table.style.display = 'table';
        },
        (error) => {
            console.error("Error loading data:", error);
            alert("Gagal memuat data: " + error.message);
            if (loadingDiv) loadingDiv.style.display = 'none';
        }
    );
}

// ======================
// UPDATE STATISTIK
// ======================
function updateStats(data) {
    // Total peserta
    document.getElementById('totalPeserta').textContent = data.length;
    
    // Peserta hari ini
    const today = new Date().toDateString();
    const todayCount = data.filter(p => {
        if (p.createdAt === 'N/A') return false;
        const regDate = new Date(p.createdAt).toDateString();
        return regDate === today;
    }).length;
    
    document.getElementById('pesertaHariIni').textContent = todayCount;
}

// ======================
// RENDER TABEL DATA
// ======================
function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    📭 Tidak ada data peserta
                </td>
            </tr>`;
        return;
    }
    
    data.forEach(user => {
        const row = document.createElement('tr');
        
        // ID untuk QR container
        const qrId = `qr-${user.code}`;
        
        row.innerHTML = `
            <td>
                <div id="${qrId}" class="qr-small"></div>
            </td>
            <td><strong>${user.code}</strong></td>
            <td>${user.nama}</td>
            <td>${user.nomorTiket}</td>
            <td><a href="mailto:${user.email}">${user.email}</a></td>
            <td><a href="tel:${user.hp}">${user.hp}</a></td>
            <td>${user.createdAt}</td>
            <td>
                <button class="btn-action btn-delete" onclick="deletePeserta('${user.id}', '${user.nama}')">
                    🗑️ Hapus
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Generate QR Code
        setTimeout(() => {
            const qrElem = document.getElementById(qrId);
            if (qrElem && typeof QRCode !== 'undefined') {
                try {
                    new QRCode(qrElem, {
                        text: user.code,
                        width: 70,
                        height: 70,
                        colorDark: "#2c3e50",
                        colorLight: "#ffffff"
                    });
                } catch (error) {
                    console.error("QR Error:", error);
                    qrElem.innerHTML = `<div style="color:#999; font-size:10px;">QR</div>`;
                }
            }
        }, 100);
    });
}

// ======================
// FUNGSI PENCARIAN
// ======================
function searchData() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    if (!searchTerm) {
        renderTable(globalData);
        return;
    }
    
    const filtered = globalData.filter(user =>
        user.nama.toLowerCase().includes(searchTerm) ||
        user.code.includes(searchTerm) ||
        user.nomorTiket.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.hp.includes(searchTerm)
    );
    
    renderTable(filtered);
}

// ======================
// HAPUS PESERTA
// ======================
async function deletePeserta(id, nama) {
    if (!confirm(`Hapus peserta "${nama}"? Tindakan ini tidak dapat dibatalkan!`)) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, DB_COLLECTION, id));
        alert(`Peserta "${nama}" berhasil dihapus!`);
    } catch (error) {
        console.error("Delete error:", error);
        alert("Gagal menghapus: " + error.message);
    }
}

// ======================
// EXPORT KE CSV
// ======================
function exportToCSV() {
    if (globalData.length === 0) {
        alert("Tidak ada data untuk diexport!");
        return;
    }
    
    // Header CSV
    const headers = ["Kode", "Nama", "Nomor Tiket", "Email", "No. HP", "Tanggal Daftar"];
    
    // Data CSV
    const csvRows = [
        headers.join(","),
        ...globalData.map(user => [
            `"${user.code}"`,
            `"${user.nama}"`,
            `"${user.nomorTiket}"`,
            `"${user.email}"`,
            `"${user.hp}"`,
            `"${user.createdAt}"`
        ].join(","))
    ];
    
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `data-peserta-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Data berhasil diexport (${globalData.length} peserta)`);
}

// ======================
// REFRESH DATA
// ======================
function refreshData() {
    loadData();
    alert("Data direfresh!");
}

// ======================
// INITIALIZE PAGE
// ======================
document.addEventListener('DOMContentLoaded', function() {
    // Load data saat halaman dibuka
    loadData();
    
    // Setup global functions
    window.searchData = searchData;
    window.deletePeserta = deletePeserta;
    window.exportToCSV = exportToCSV;
    window.refreshData = refreshData;
});
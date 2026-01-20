import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, query, where, getDocs, 
    deleteDoc, doc, onSnapshot 
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const dbCollection = "peserta";

const tableBody = document.getElementById('tableBody');
let globalData = [];

// --- LOGIKA UTAMA ---

if (tableBody) {
    // Mendengarkan perubahan data secara Realtime
    onSnapshot(query(collection(db, dbCollection)), (snapshot) => {
        globalData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTable(globalData);
    });

    window.renderTable = (dataArray) => {
        tableBody.innerHTML = '';
        dataArray.forEach(user => {
            // Membuat baris tabel dengan semua field data
            let row = `
                <tr>
                    <td style="text-align:center;">
                        <div id="qr-table-${user.code}" class="qr-container"></div>
                    </td>
                    <td><b>${user.code}</b></td>
                    <td>${user.nama}</td>
                    <td>${user.nomorTiket || '-'}</td>
                    <td>${user.email}</td>
                    <td>${user.hp || '-'}</td>
                    <td><button class="btn-delete" data-id="${user.id}">Hapus</button></td>
                </tr>`;
            tableBody.innerHTML += row;
        });

        // Men-generate QR Code untuk setiap peserta di dalam tabel
        dataArray.forEach(user => {
            const qrElem = document.getElementById(`qr-table-${user.code}`);
            if (qrElem) {
                new QRCode(qrElem, {
                    text: user.code,
                    width: 60,
                    height: 60
                });
            }
        });

        // Event listener untuk tombol hapus
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = async () => {
                if(confirm('Hapus data ini secara permanen?')) {
                    try {
                        await deleteDoc(doc(db, dbCollection, btn.dataset.id));
                    } catch (error) {
                        alert("Gagal menghapus: " + error.message);
                    }
                }
            };
        });
    };

    // Fungsi Pencarian Data
    window.searchData = () => {
        const term = document.getElementById('searchInput').value.toLowerCase();
        const filtered = globalData.filter(u => 
            u.nama.toLowerCase().includes(term) || 
            u.code.includes(term) ||
            (u.nomorId && u.nomorId.includes(term))
        );
        renderTable(filtered);
    };

    // Fungsi Pengurutan A-Z
    window.sortData = () => {
        globalData.sort((a, b) => a.nama.localeCompare(b.nama));
        renderTable(globalData);
    };

    // Menghubungkan fungsi ke elemen HTML karena menggunakan type="module"
    const btnSort = document.getElementById('btnSort');
    const searchInput = document.getElementById('searchInput');
    if(btnSort) btnSort.onclick = window.sortData;
    if(searchInput) searchInput.onkeyup = window.searchData;
}

// --- LOGIKA SCANNER ---
const reader = document.getElementById('reader');
if (reader) {
    const onScanSuccess = async (decodedText) => {
        // Logika verifikasi QR Code di halaman scan.html
        const q = query(collection(db, dbCollection), where("code", "==", decodedText));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const user = snap.docs[0].data();
            const resultDiv = document.getElementById('scanResult');
            resultDiv.style.display = 'block';
            document.getElementById('resNama').innerText = user.nama;
            document.getElementById('resKode').innerText = user.code;
            alert("✅ Data Valid: " + user.nama);
        } else {
            alert("❌ Data Tidak Ditemukan!");
        }
    };

    // Periksa apakah library Html5QrcodeScanner tersedia sebelum inisialisasi
    if (typeof Html5QrcodeScanner !== 'undefined') {
        const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        html5QrcodeScanner.render(onScanSuccess);
    }
}

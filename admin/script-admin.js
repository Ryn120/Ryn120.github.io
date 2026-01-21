import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, query, where, getDocs, 
    deleteDoc, doc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- 1. LOGIKA TABEL ADMIN (Realtime) ---
const tableBody = document.getElementById('tableBody');
let globalData = [];

if (tableBody) {
    onSnapshot(query(collection(db, dbCollection)), (snapshot) => {
        globalData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTable(globalData);
    });

    window.renderTable = (data) => {
        tableBody.innerHTML = '';
        data.forEach(user => {
            let row = `
                <tr>
                    <td><div id="qr-${user.code}"></div></td>
                    <td>${user.code}</td>
                    <td><strong>${user.nama}</strong></td>
                    <td>${user.nomorTiket || '-'}</td>
                    <td>${user.email}</td>
                    <td>
                        <button class="btn-delete" onclick="hapusData('${user.id}')">Hapus</button>
                    </td>
                </tr>`;
            tableBody.innerHTML += row;
        });

        // Generate QR Kecil di Tabel
        data.forEach(user => {
            new QRCode(document.getElementById(`qr-${user.code}`), {
                text: user.code, width: 50, height: 50
            });
        });
    };

    // Fungsi Global untuk HTML
    window.hapusData = async (id) => {
        if(confirm("Hapus data ini permanen?")) {
            await deleteDoc(doc(db, dbCollection, id));
        }
    };

    window.searchData = () => {
        const term = document.getElementById('searchInput').value.toLowerCase();
        const filtered = globalData.filter(u => 
            u.nama.toLowerCase().includes(term) || 
            u.code.includes(term) ||
            (u.nomorTiket && u.nomorTiket.toLowerCase().includes(term))
        );
        renderTable(filtered);
    };
    
    document.getElementById('searchInput').addEventListener('keyup', window.searchData);
}

// --- 2. LOGIKA SCANNER (Stabilized) ---
const readerElem = document.getElementById('reader');

if (readerElem) {
    let html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", 
        { fps: 10, qrbox: {width: 250, height: 250} },
        /* verbose= */ false
    );

    async function onScanSuccess(decodedText, decodedResult) {
        // 1. Pause scanner agar tidak scan berulang kali
        html5QrcodeScanner.pause(); 
        
        // 2. Cari Data di Firebase
        try {
            const q = query(collection(db, dbCollection), where("code", "==", decodedText));
            const snap = await getDocs(q);

            const resDiv = document.getElementById('scanResult');
            const resNama = document.getElementById('resNama');
            const resKode = document.getElementById('resKode');

            if (!snap.empty) {
                // DATA DITEMUKAN
                const user = snap.docs[0].data();
                resDiv.style.display = 'block';
                resDiv.style.backgroundColor = '#d4edda'; // Hijau
                resDiv.style.borderColor = '#c3e6cb';
                resDiv.innerHTML = `
                    <h3>✅ DATA VALID</h3>
                    <p><strong>Nama:</strong> ${user.nama}</p>
                    <p><strong>Tiket:</strong> ${user.nomorTiket}</p>
                    <p><strong>Kode:</strong> ${user.code}</p>
                    <button onclick="resetScanner()" style="margin-top:10px; padding:10px;">Scan Lagi</button>
                `;
            } else {
                // DATA TIDAK DITEMUKAN
                resDiv.style.display = 'block';
                resDiv.style.backgroundColor = '#f8d7da'; // Merah
                resDiv.style.borderColor = '#f5c6cb';
                resDiv.innerHTML = `
                    <h3>❌ TIDAK DITEMUKAN</h3>
                    <p>Kode: ${decodedText}</p>
                    <button onclick="resetScanner()" style="margin-top:10px; padding:10px;">Scan Lagi</button>
                `;
            }
        } catch (err) {
            console.error(err);
            alert("Error koneksi database");
            resetScanner();
        }
    }

    // Fungsi untuk melanjutkan scan
    window.resetScanner = () => {
        document.getElementById('scanResult').style.display = 'none';
        html5QrcodeScanner.resume();
    };

    html5QrcodeScanner.render(onScanSuccess);
}

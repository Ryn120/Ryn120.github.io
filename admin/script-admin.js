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

// --- LOGIKA TABEL DATA (index.html Admin) ---
const tableBody = document.getElementById('tableBody');
let globalData = [];

if (tableBody) {
    // Realtime Listener
    onSnapshot(query(collection(db, dbCollection)), (snapshot) => {
        globalData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTable(globalData);
    });

    window.renderTable = (dataArray) => {
        tableBody.innerHTML = '';
        dataArray.forEach(user => {
            tableBody.innerHTML += `
                <tr>
                    <td>${user.code}</td>
                    <td>${user.nama}</td>
                    <td>${user.email}</td>
                    <td><button class="btn-delete" data-id="${user.id}">Hapus</button></td>
                </tr>`;
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = () => deleteUser(btn.dataset.id);
        });
    };

    const deleteUser = async (id) => {
        if(confirm('Hapus data ini?')) await deleteDoc(doc(db, dbCollection, id));
    };

    // Binding fungsi ke Window agar bisa dipanggil dari HTML (karena type="module")
    window.searchData = () => {
        const term = document.getElementById('searchInput').value.toLowerCase();
        const filtered = globalData.filter(u => u.nama.toLowerCase().includes(term) || u.code.includes(term));
        renderTable(filtered);
    };

    window.sortData = () => {
        globalData.sort((a, b) => a.nama.localeCompare(b.nama));
        renderTable(globalData);
    };

    // Hubungkan tombol di HTML ke fungsi ini
    if(document.getElementById('btnSort')) document.getElementById('btnSort').onclick = window.sortData;
    if(document.getElementById('searchInput')) document.getElementById('searchInput').onkeyup = window.searchData;
}

// --- LOGIKA SCANNER (scan.html Admin) ---
const reader = document.getElementById('reader');
if (reader) {
    const onScanSuccess = async (decodedText) => {
        // Hentikan scan sementara
        html5QrcodeScanner.clear();
        
        const q = query(collection(db, dbCollection), where("code", "==", decodedText));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const user = snap.docs[0].data();
            document.getElementById('scanResult').style.display = 'block';
            document.getElementById('resNama').innerText = user.nama;
            document.getElementById('resKode').innerText = user.code;
            alert("✅ Valid: " + user.nama);
        } else {
            alert("❌ Data Tidak Ditemukan!");
            location.reload();
        }
    };

    const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
    html5QrcodeScanner.render(onScanSuccess);
}

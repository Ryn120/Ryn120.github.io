// --- IMPORT FIREBASE (Jangan dihapus) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, 
    query, where, deleteDoc, doc, onSnapshot, or 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- KONFIGURASI FIREBASE ---
// ⚠️ PASTE CONFIG ANDA DARI FIREBASE CONSOLE DI SINI ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyDCEU9nyFJi-eSy0Uq3ysXbQlV7Ri4x-Gs",
  authDomain: "qr-generet01.firebaseapp.com",
  projectId: "qr-generet01",
  storageBucket: "qr-generet01.firebasestorage.app",
  messagingSenderId: "753131681292",
  appId: "1:753131681292:web:d7622e7188ba1395e8a029"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const dbCollection = "peserta"; // Nama koleksi di database

// --- LOGIKA HALAMAN PENDAFTARAN (index.html) ---
const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = registerForm.querySelector('button');
        btn.innerText = "Memproses...";
        btn.disabled = true;

        let nama = document.getElementById('nama').value;
        let nomorId = document.getElementById('nomorId').value;
        let email = document.getElementById('email').value;
        let hp = document.getElementById('hp').value;

        try {
            // 1. Cek Duplikasi (Query ke Firebase)
            // Cek apakah email, nomorId, atau hp sudah ada
            const q = query(collection(db, dbCollection), 
                or(
                    where("email", "==", email),
                    where("nomorId", "==", nomorId),
                    where("hp", "==", hp)
                )
            );
            
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                alert("Gagal! Nomor ID, Email, atau HP sudah terdaftar.");
                btn.innerText = "Daftar & Generate QR";
                btn.disabled = false;
                return;
            }

            // 2. Generate 8 Angka Random
            let randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
            
            // Cek unik kode (opsional, tapi good practice)
            const codeCheck = await getDocs(query(collection(db, dbCollection), where("code", "==", randomCode)));
            if(!codeCheck.empty) {
                // Jika kebetulan sama, generate lagi sekali lagi
                randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
            }

            // 3. Simpan ke Firebase
            await addDoc(collection(db, dbCollection), {
                nama: nama,
                nomorId: nomorId,
                email: email,
                hp: hp,
                code: randomCode,
                createdAt: new Date()
            });

            // 4. Tampilkan QR
            registerForm.style.display = 'none';
            document.getElementById('resultArea').style.display = 'block';
            document.getElementById('uniqueCode').innerText = randomCode;

            // Generate gambar QR (Library QR Code harus sudah diload di HTML)
            new QRCode(document.getElementById("qrcode"), {
                text: randomCode,
                width: 128,
                height: 128
            });

            alert("Pendaftaran Berhasil & Tersimpan di Cloud!");

        } catch (error) {
            console.error("Error: ", error);
            alert("Terjadi kesalahan koneksi: " + error.message);
            btn.innerText = "Daftar & Generate QR";
            btn.disabled = false;
        }
    });
}

// --- LOGIKA HALAMAN ADMIN (admin.html) ---
// Menggunakan onSnapshot untuk REALTIME UPDATE
const tableBody = document.querySelector('#dataTable tbody');

if (tableBody) {
    // Listener Realtime: Jika ada data baru masuk, tabel otomatis update tanpa refresh
    const q = query(collection(db, dbCollection));
    
    // Simpan data global untuk fitur search/sort lokal
    let globalData = [];

    onSnapshot(q, (snapshot) => {
        globalData = [];
        snapshot.forEach((doc) => {
            globalData.push({ id: doc.id, ...doc.data() });
        });
        renderTable(globalData);
    });

    // Fungsi Render Tabel
    window.renderTable = function(dataArray) {
        tableBody.innerHTML = '';
        dataArray.forEach((user) => {
            let row = `<tr>
                <td>${user.code}</td>
                <td>${user.nama}</td>
                <td>${user.nomorId}</td>
                <td>${user.email}</td>
                <td>${user.hp}</td>
                <td><button class="btn-delete" data-id="${user.id}">Hapus</button></td>
            </tr>`;
            tableBody.innerHTML += row;
        });

        // Pasang event listener untuk tombol hapus (karena type module tidak bisa onclick inline string function)
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', function() {
                deleteUser(this.getAttribute('data-id'));
            });
        });
    }

    // Fungsi Hapus
    window.deleteUser = async function(docId) {
        if(confirm('Yakin ingin menghapus data ini permanen dari server?')) {
            try {
                await deleteDoc(doc(db, dbCollection, docId));
                alert('Data dihapus.');
            } catch (e) {
                alert('Gagal menghapus: ' + e.message);
            }
        }
    }

    // Fungsi Sorting (Lokal)
    window.sortData = function() {
        globalData.sort((a, b) => a.nama.localeCompare(b.nama));
        renderTable(globalData);
    }

    // Fungsi Search (Lokal)
    window.searchData = function() {
        let input = document.getElementById('searchInput').value.toLowerCase();
        let filtered = globalData.filter(user => 
            user.nama.toLowerCase().includes(input) || 
            user.code.includes(input)
        );
        renderTable(filtered);
    }
    
    // Expose fungsi ke window agar bisa dipanggil tombol HTML
    // Karena module scope itu tertutup
    document.querySelector("button[onclick='sortData()']").onclick = window.sortData;
    document.querySelector("input[onkeyup='searchData()']").onkeyup = window.searchData;
    // Tombol hapus semua (hati-hati)
    // Untuk Firebase, hapus semua agak kompleks, jadi kita skip dulu atau loop delete
}

// --- LOGIKA HALAMAN SCAN (scan.html) ---
const readerElement = document.getElementById('reader');
if (readerElement) {
    async function onScanSuccess(decodedText, decodedResult) {
        html5QrcodeScanner.clear(); 
        
        document.getElementById('reader').innerHTML = "<p>Memproses data...</p>";

        try {
            // Cari data di Firebase berdasarkan code
            const q = query(collection(db, dbCollection), where("code", "==", decodedText));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Data Ditemukan
                const userData = querySnapshot.docs[0].data();
                
                document.getElementById('scanResult').style.display = 'block';
                document.getElementById('scanResult').style.borderColor = '#28a745'; 
                document.getElementById('resNama').innerText = userData.nama;
                document.getElementById('resKode').innerText = userData.code;
                alert("Data Valid: " + userData.nama);
            } else {
                alert("Data TIDAK ditemukan di database cloud!");
                location.reload(); 
            }
        } catch (error) {
            alert("Error mengambil data: " + error.message);
            location.reload();
        }
    }

    let html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
    html5QrcodeScanner.render(onScanSuccess);
}

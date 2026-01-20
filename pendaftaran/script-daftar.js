import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, query, where, or 
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

const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = registerForm.querySelector('button');
        btn.innerText = "Memproses...";
        btn.disabled = true;

        const nama = document.getElementById('nama').value;
        const nomorTiket = document.getElementById('nomorTiket').value;
        const email = document.getElementById('email').value;
        const hp = document.getElementById('hp').value;

        try {
            // 1. Cek Duplikasi (Email/ID/HP tidak boleh sama)
            const q = query(collection(db, dbCollection), 
                or(
                    where("email", "==", email),
                    where("nomorTiket", "==", nomorTiket),
                    where("hp", "==", hp)
                )
            );
            
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                alert("Gagal! Data (Tiket/Email/HP) sudah terdaftar.");
                btn.innerText = "Daftar & Ambil QR";
                btn.disabled = false;
                return;
            }

            // 2. Generate 8 Angka Random Unik
            const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();

            // 3. Simpan ke Firebase
            await addDoc(collection(db, dbCollection), {
                  nama: nama,
                  nomorTiket: nomorTiket, // Nama field di database berubah jadi nomorTiket
                  email: email,
                  hp: hp,
                  code: randomCode,
                  createdAt: new Date()
                });


            // 4. Tampilkan Hasil & QR
            registerForm.style.display = 'none';
            document.getElementById('resultArea').style.display = 'block';
            document.getElementById('uniqueCode').innerText = randomCode;

            // Tambahkan baris ini setelah library QRCode men-generate gambar
            new QRCode(document.getElementById("qrcode"), {
              text: randomCode,
               width: 150,
              height: 150
});

            // Logika Unduh Gambar
            const downloadBtn = document.getElementById('downloadBtn');
            downloadBtn.onclick = function() {
    // Ambil elemen gambar di dalam div qrcode
                const qrImg = document.querySelector('#qrcode img');
                if (qrImg) {
                    const link = document.createElement('a');
                    link.href = qrImg.src;
                    link.download = `QR-${randomCode}.png`;
                    link.click();
    } else {
        alert("Gambar belum siap, silakan tunggu.");
    }
};

        } catch (error) {
            alert("Error: " + error.message);
            btn.innerText = "Daftar & Ambil QR";
            btn.disabled = false;
        }
    });
}

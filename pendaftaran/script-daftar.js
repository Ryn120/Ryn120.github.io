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

        // Pastikan ID di HTML juga sudah diubah menjadi 'nomorTiket'
        const nama = document.getElementById('nama').value;
        const nomorTiket = document.getElementById('nomorTiket').value;
        const email = document.getElementById('email').value;
        const hp = document.getElementById('hp').value;

        try {
            // 1. Cek Duplikasi di Database (Email/Tiket/HP tidak boleh sama)
            const q = query(collection(db, dbCollection), 
                or(
                    where("email", "==", email),
                    where("nomorTiket", "==", nomorTiket),
                    where("hp", "==", hp)
                )
            );
            
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                alert("Gagal! Nomor Tiket, Email, atau HP sudah terdaftar.");
                btn.innerText = "Daftar & Ambil QR";
                btn.disabled = false;
                return;
            }

            // 2. Generate 8 Angka Random Unik untuk QR
            const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();

            // 3. Simpan ke Firebase dengan field 'nomorTiket'
            await addDoc(collection(db, dbCollection), {
                nama: nama,
                nomorTiket: nomorTiket, 
                email: email,
                hp: hp,
                code: randomCode,
                createdAt: new Date()
            });

            // 4. Tampilkan Area Hasil & Generate QR
            registerForm.style.display = 'none';
            const resultArea = document.getElementById('resultArea');
            if (resultArea) resultArea.style.display = 'block';
            
            const uniqueCodeDisplay = document.getElementById('uniqueCode');
            if (uniqueCodeDisplay) uniqueCodeDisplay.innerText = randomCode;

            const qrContainer = document.getElementById("qrcode");
            qrContainer.innerHTML = ""; // Bersihkan QR lama

            // Membuat QR Code
            const qrcode = new QRCode(qrContainer, {
                text: randomCode,
                width: 200,
                height: 200,
                correctLevel : QRCode.CorrectLevel.H
            });

            // 5. Logika Unduh Gambar (Solusi agar gambar bisa dibuka)
            // Kita butuh timeout agar library QRCode selesai menggambar ke Canvas/IMG
            setTimeout(() => {
                const downloadBtn = document.getElementById('downloadBtn');
                if (downloadBtn) {
                    downloadBtn.onclick = function() {
                        // Mencari elemen gambar yang dihasilkan library
                        const qrImg = qrContainer.querySelector('img');
                        const qrCanvas = qrContainer.querySelector('canvas');
                        
                        const link = document.createElement('a');
                        
                        // Jika library menghasilkan IMG (Base64), ambil src-nya
                        // Jika hanya Canvas, konversi canvas ke DataURL
                        if (qrImg && qrImg.src) {
                            link.href = qrImg.src;
                        } else if (qrCanvas) {
                            link.href = qrCanvas.toDataURL("image/png");
                        } else {
                            alert("Gagal memproses gambar. Silakan screenshot layar.");
                            return;
                        }

                        link.download = `Tiket-${nama}-${randomCode}.png`;
                        link.click();
                    };
                }
            }, 800);

            alert("Pendaftaran Berhasil!");

        } catch (error) {
            console.error("Error pendaftaran:", error);
            alert("Terjadi kesalahan: " + error.message);
            btn.innerText = "Daftar & Ambil QR";
            btn.disabled = false;
        }
    });
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore, collection, addDoc, getDocs,
    query, where, or, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- Konfigurasi Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDCEU9nyFJi-eSy0Uq3ysXbQlV7Ri4x-Gs",
  authDomain: "qr-generet01.firebaseapp.com",
  projectId: "qr-generet01",
  storageBucket: "qr-generet01.appspot.com",
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

        // Ambil dan trim nilai input
        const nama = document.getElementById('nama').value.trim();
        const nomorTiket = document.getElementById('nomorTiket').value.trim();
        const email = document.getElementById('email').value.trim();
        const hp = document.getElementById('hp').value.trim();

        // Validasi sederhana
        if (!nama || !nomorTiket || !email || !hp) {
            alert("Semua bidang harus diisi.");
            return;
        }

        btn.innerText = "Memproses...";
        btn.disabled = true;

        try {
            // 1. Cek duplikasi (OR query Firestore terbaru)7
            const q = query(
                collection(db, dbCollection),
                or(
                    where("email", "==", email),
                    where("nomorTiket", "==", nomorTiket),
                    where("hp", "==", hp)
                ),
                limit(1) // batasi satu hasil untuk efisiensi
            );

            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                alert("Gagal! Nomor Tiket, Email, atau HP sudah terdaftar.");
                btn.innerText = "Daftar & Ambil QR";
                btn.disabled = false;
                return;
            }

            // 2. Generate kode unik 8 digit
            const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();

            // 3. Simpan data ke Firestore
            await addDoc(collection(db, dbCollection), {
                nama: nama,
                nomorTiket: nomorTiket,
                email: email,
                hp: hp,
                code: randomCode,
                createdAt: new Date()
            });

            // 4. Tampilkan hasil & buat QR code
            registerForm.style.display = 'none';
            const resultArea = document.getElementById('resultArea');
            if (resultArea) resultArea.style.display = 'block';

            const uniqueCodeDisplay = document.getElementById('uniqueCode');
            if (uniqueCodeDisplay) uniqueCodeDisplay.innerText = randomCode;

            const qrContainer = document.getElementById("qrcode");
            qrContainer.innerHTML = ""; // kosongkan dulu
            new QRCode(qrContainer, {
                text: randomCode,
                width: 200,
                height: 200,
                correctLevel: QRCode.CorrectLevel.H
            });

            // Pasang event unduh
            const downloadBtn = document.getElementById('downloadBtn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', function() {
                    const qrImg = qrContainer.querySelector('img');
                    const qrCanvas = qrContainer.querySelector('canvas');
                    const link = document.createElement('a');

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
                });
            }

        } catch (error) {
            console.error("Error pendaftaran:", error);
            alert("Terjadi kesalahan: " + error.message);
            btn.innerText = "Daftar & Ambil QR";
            btn.disabled = false;
        }
    });
}
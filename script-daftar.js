import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, query, where, or, serverTimestamp 
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

// --- LOGIKA PENDAFTARAN ---
const form = document.getElementById("daftarForm");

if (form) {
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const btn = form.querySelector('button');
        const originalText = btn.innerHTML;
        const msgDiv = document.getElementById("message");
        
        // Reset pesan
        msgDiv.style.display = 'none';
        msgDiv.className = '';
        
        // Ambil Data
        const nama = document.getElementById("nama").value.trim();
        const nomorTiket = document.getElementById("nomorTiket").value.trim();
        const email = document.getElementById("email").value.trim();
        const hp = document.getElementById("hp").value.trim();

        // Validasi Sederhana
        if (!nama || !nomorTiket || !email || !hp) {
            showMessage("Semua data wajib diisi!", "error");
            return;
        }

        btn.disabled = true;
        btn.innerHTML = "⏳ Memproses...";

        try {
            // 1. Cek Duplikasi (Sekali query untuk semua field)
            const q = query(collection(db, dbCollection), 
                or(
                    where("nomorTiket", "==", nomorTiket),
                    where("email", "==", email)
                )
            );
            
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                throw new Error("Nomor Tiket atau Email sudah terdaftar!");
            }

            // 2. Generate Kode Unik 8 Digit
            const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();

            // 3. Simpan ke Firestore
            await addDoc(collection(db, dbCollection), {
                nama: nama,
                nomorTiket: nomorTiket,
                email: email,
                hp: hp,
                code: randomCode,
                createdAt: serverTimestamp()
            });

            // 4. Sukses & Tampilkan QR
            form.reset();
            document.getElementById("hasilPendaftaran").style.display = "block";
            document.getElementById("kodeUnikDisplay").innerText = randomCode;
            
            // Generate QR Visual
            const qrContainer = document.getElementById("qrCode");
            qrContainer.innerHTML = "";
            new QRCode(qrContainer, {
                text: randomCode,
                width: 200,
                height: 200,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });

            // Siapkan Tombol Download dengan Delay (Agar canvas ter-render sempurna)
            setTimeout(() => {
                const downloadBtn = document.getElementById("downloadBtn");
                downloadBtn.onclick = () => downloadQRCode(qrContainer, nama, randomCode, nomorTiket);
            }, 1000);

            showMessage("✅ Pendaftaran Berhasil!", "success");
            document.getElementById("hasilPendaftaran").scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error(error);
            showMessage("❌ Gagal: " + error.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
}

function showMessage(text, type) {
    const msg = document.getElementById("message");
    msg.style.display = 'block';
    msg.textContent = text;
    msg.className = type === "error" ? "message-error" : "message-success";
}

// Fungsi Download yang Stabil
function downloadQRCode(container, nama, code, tiket) {
    const qrImg = container.querySelector("img");
    
    if (qrImg && qrImg.src) {
        // Buat canvas baru untuk menggabungkan teks dan QR
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 500;
        
        canvas.width = size;
        canvas.height = size + 100;
        
        // Background Putih
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Gambar QR
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = qrImg.src;
        
        img.onload = () => {
            ctx.drawImage(img, 50, 50, 400, 400);
            
            // Tambah Teks
            ctx.fillStyle = "#000";
            ctx.font = "bold 24px Arial";
            ctx.textAlign = "center";
            ctx.fillText(nama, size/2, 40); // Nama di atas
            ctx.fillText(`Tiket: ${tiket} | Code: ${code}`, size/2, size + 60); // Info di bawah
            
            // Download
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `TIKET-${nama}-${code}.png`;
            link.click();
        };
    } else {
        alert("Gambar QR belum siap. Coba lagi dalam 2 detik.");
    }
}

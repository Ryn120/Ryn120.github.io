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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ======================
// FUNGSI GENERATE KODE 8 DIGIT
// ======================
function generateRandomCode() {
    let code = '';
    const digits = '0123456789';
    
    for (let i = 0; i < 8; i++) {
        code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    
    return code;
}

// ======================
// PROSES PENDAFTARAN
// ======================
document.getElementById("daftarForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    
    // Ambil nilai form
    const nama = document.getElementById("nama").value.trim();
    const nomorTiket = document.getElementById("nomorTiket").value.trim();
    const email = document.getElementById("email").value.trim();
    const hp = document.getElementById("hp").value.trim();
    
    const messageDiv = document.getElementById("message");
    messageDiv.textContent = "";
    messageDiv.className = "";
    
    // Validasi
    if (!nama || !nomorTiket || !email || !hp) {
        messageDiv.textContent = "❌ Semua field wajib diisi!";
        messageDiv.className = "message-error";
        return;
    }
    
    // Validasi email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        messageDiv.textContent = "❌ Format email tidak valid!";
        messageDiv.className = "message-error";
        return;
    }
    
    // Tampilkan loading
    messageDiv.innerHTML = '<div class="spinner"></div><p>Memproses pendaftaran...</p>';
    messageDiv.className = "message-info";
    
    try {
        // Cek duplikasi nomor tiket
        const tiketSnapshot = await db.collection("peserta")
            .where("nomorTiket", "==", nomorTiket)
            .get();
            
        if (!tiketSnapshot.empty) {
            messageDiv.textContent = "❌ Nomor tiket sudah terdaftar!";
            messageDiv.className = "message-error";
            return;
        }
        
        // Cek duplikasi email
        const emailSnapshot = await db.collection("peserta")
            .where("email", "==", email)
            .get();
            
        if (!emailSnapshot.empty) {
            messageDiv.textContent = "❌ Email sudah terdaftar!";
            messageDiv.className = "message-error";
            return;
        }
        
        // Generate kode unik 8 digit
        let code;
        let isUnique = false;
        
        // Coba maksimal 5 kali untuk mendapatkan kode unik
        for (let i = 0; i < 5; i++) {
            code = generateRandomCode();
            const codeSnapshot = await db.collection("peserta")
                .where("code", "==", code)
                .get();
                
            if (codeSnapshot.empty) {
                isUnique = true;
                break;
            }
        }
        
        if (!isUnique) {
            // Fallback: timestamp
            code = Date.now().toString().slice(-8);
        }
        
        // Data peserta
        const pesertaData = {
            nama: nama,
            nomorTiket: nomorTiket,
            email: email,
            hp: hp,
            code: code, // 8 digit random
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: "active"
        };
        
        // Simpan ke Firebase
        await db.collection("peserta").add(pesertaData);
        
        // Tampilkan hasil
        document.getElementById("hasilPendaftaran").style.display = "block";
        document.getElementById("kodeUnikDisplay").textContent = code;
        
        // Generate QR Code
        const qrContainer = document.getElementById("qrCode");
        qrContainer.innerHTML = "";
        
        new QRCode(qrContainer, {
            text: code, // Gunakan code 8 digit untuk QR
            width: 250,
            height: 250,
            colorDark: "#2c3e50",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // Setup download button
        document.getElementById("downloadBtn").onclick = function() {
            downloadQRCode(qrContainer, nama, code, nomorTiket);
        };
        
        // Reset form
        document.getElementById("daftarForm").reset();
        
        messageDiv.textContent = "✅ Pendaftaran berhasil! Scroll ke bawah untuk melihat QR Code.";
        messageDiv.className = "message-success";
        
        // Scroll ke hasil
        document.getElementById("hasilPendaftaran").scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error("Error:", error);
        messageDiv.textContent = "❌ Terjadi kesalahan: " + error.message;
        messageDiv.className = "message-error";
    }
});

// ======================
// FUNGSI DOWNLOAD QR CODE
// ======================
function downloadQRCode(qrContainer, nama, code, nomorTiket) {
    const canvas = qrContainer.querySelector("canvas");
    
    if (!canvas) {
        alert("QR Code belum siap. Tunggu sebentar.");
        return;
    }
    
    // Buat canvas baru dengan background putih
    const newCanvas = document.createElement("canvas");
    const size = 500;
    newCanvas.width = size;
    newCanvas.height = size + 100; // Tambahan untuk teks
    
    const ctx = newCanvas.getContext("2d");
    
    // Background putih
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    
    // Gambar QR Code
    const qrSize = 400;
    const qrX = (size - qrSize) / 2;
    const qrY = 40;
    
    ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize);
    
    // Tambahkan teks informasi
    ctx.fillStyle = "#2c3e50";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("TIKET PESERTA", size / 2, 30);
    
    ctx.font = "22px Arial";
    ctx.fillText(nama, size / 2, size + 50);
    
    ctx.font = "18px Arial";
    ctx.fillStyle = "#666";
    ctx.fillText(`Kode: ${code} | Tiket: ${nomorTiket}`, size / 2, size + 80);
    
    // Border
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, size - 20, size + 80);
    
    // Download
    const link = document.createElement("a");
    link.href = newCanvas.toDataURL("image/png");
    link.download = `Tiket-${nama.replace(/\s+/g, '-')}-${code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
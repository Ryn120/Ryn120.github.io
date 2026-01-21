// Firebase configuration (sama dengan pendaftaran)
const firebaseConfig = {
    apiKey: "AIzaSyDCEU9nyFJi-eSy0Uq3ysXbQlV7Ri4x-Gs",
    authDomain: "qr-generet01.firebaseapp.com",
    projectId: "qr-generet01",
    storageBucket: "qr-generet01.firebasestorage.app",
    messagingSenderId: "753131681292",
    appId: "1:753131681292:web:d7622e7188ba1395e8a029"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let ticketData = null;

// Handle ticket search
document.getElementById("cekForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const noTiket = document.getElementById('cekNomorTiket').value.trim();
    const message = document.getElementById('messageCek');
    message.innerHTML = "";
    message.className = "";
    
    document.getElementById('verifikasiForm').style.display = "none";
    document.getElementById('qrCode').innerHTML = "";
    document.getElementById('downloadBtn').style.display = "none";
    ticketData = null;

    if (!noTiket) {
        message.innerHTML = "❌ Masukkan nomor tiket terlebih dahulu!";
        message.className = "message-error";
        return;
    }

    try {
        message.innerHTML = "🔍 Mencari tiket...";
        message.className = "message-info";

        // Cari berdasarkan nomorTiket
        const snap = await db.collection('peserta').where('nomorTiket', '==', noTiket).get();
        
        if (snap.empty) {
            message.innerHTML = "❌ Tiket tidak ditemukan!";
            message.className = "message-error";
            return;
        }
        
        // Ambil data
        const doc = snap.docs[0];
        ticketData = {
            ...doc.data(),
            id: doc.id
        };

        // Tampilkan form verifikasi
        document.getElementById('verifikasiForm').style.display = "block";
        document.getElementById('namaCek').value = "";
        document.getElementById('hpCek').value = "";
        
        message.innerHTML = "✅ Tiket ditemukan. Silakan verifikasi data Anda.";
        message.className = "message-success";

    } catch (error) {
        console.error("Error:", error);
        message.innerHTML = "❌ Error: " + error.message;
        message.className = "message-error";
    }
});

// Handle verification
document.getElementById("verifBtn").addEventListener("click", function() {
    if (!ticketData) return;
    
    const namaInput = document.getElementById('namaCek').value.trim();
    const hpInput = document.getElementById('hpCek').value.trim();
    const message = document.getElementById('messageCek');

    // Validasi input
    if (!namaInput || !hpInput) {
        message.innerHTML = "❌ Harap isi nama dan nomor HP untuk verifikasi!";
        message.className = "message-error";
        return;
    }

    // Cocokkan data - case insensitive dan trim spasi
    if (namaInput.toLowerCase() === ticketData.nama.toLowerCase() && 
        hpInput.trim() === ticketData.hp.trim()) {
        
        // VERIFIKASI BERHASIL
        const qrContainer = document.getElementById("qrCode");
        qrContainer.innerHTML = "";
        
        // PASTIKAN menggunakan code yang sama dengan yang disimpan!
        const qrCode = ticketData.code || ticketData.id;
        
        // Generate QR Code
        new QRCode(qrContainer, {
            text: qrCode,
            width: 200,
            height: 200,
            colorDark: "#2c3e50",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // Tampilkan tombol download
        const downloadBtn = document.getElementById("downloadBtn");
        downloadBtn.style.display = "inline";
        downloadBtn.onclick = function() {
            downloadQRCode(qrContainer, ticketData.nama, qrCode, ticketData.nomorTiket);
        };
        
        message.innerHTML = "✅ Verifikasi berhasil! QR Code Anda siap.";
        message.className = "message-success";
        
    } else {
        message.innerHTML = "❌ Nama atau Nomor HP tidak cocok!";
        message.className = "message-error";
    }
});

// Fungsi download QR Code yang SAMA dengan halaman daftar
function downloadQRCode(qrContainer, nama, code, nomorTiket) {
    const canvas = qrContainer.querySelector("canvas");
    
    if (!canvas) {
        alert("QR Code belum siap. Tunggu sebentar.");
        return;
    }

    // Buat canvas baru dengan ukuran lebih besar
    const newCanvas = document.createElement("canvas");
    const size = 500;
    newCanvas.width = size;
    newCanvas.height = size + 80;

    const ctx = newCanvas.getContext("2d");
    
    // Background putih
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    
    // Gambar QR Code
    const qrSize = 400;
    const qrX = (size - qrSize) / 2;
    const qrY = 40;
    
    ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize);
    
    // Tambahkan informasi teks
    ctx.fillStyle = "#2c3e50";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("TIKET PESERTA", size / 2, 30);
    
    ctx.font = "18px Arial";
    ctx.fillText(nama, size / 2, size + 40);
    
    ctx.font = "16px Arial";
    ctx.fillStyle = "#666";
    ctx.fillText(`Kode: ${code} | Tiket: ${nomorTiket}`, size / 2, size + 65);
    
    // Border
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, size - 20, size + 60);
    
    // Download
    const link = document.createElement("a");
    link.href = newCanvas.toDataURL("image/png");
    link.download = `Tiket-${nama.replace(/\s+/g, '-')}-${code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Auto-focus
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('cekNomorTiket').focus();
});
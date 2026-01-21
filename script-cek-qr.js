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

let ticketData = null;

// ======================
// CARI TIKET
// ======================
document.getElementById("cekForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const noTiket = document.getElementById("cekNomorTiket").value.trim();
    const message = document.getElementById("messageCek");
    message.innerHTML = "";
    message.className = "";
    
    // Reset tampilan
    document.getElementById("verifikasiForm").style.display = "none";
    document.getElementById("hasilVerifikasi").style.display = "none";
    document.getElementById("qrCode").innerHTML = "";
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
        const snapshot = await db.collection("peserta")
            .where("nomorTiket", "==", noTiket)
            .get();
        
        if (snapshot.empty) {
            message.innerHTML = "❌ Tiket tidak ditemukan!";
            message.className = "message-error";
            return;
        }
        
        // Ambil data tiket
        const doc = snapshot.docs[0];
        ticketData = {
            id: doc.id,
            ...doc.data()
        };
        
        // Tampilkan form verifikasi
        document.getElementById("verifikasiForm").style.display = "block";
        document.getElementById("namaCek").value = "";
        document.getElementById("hpCek").value = "";
        
        message.innerHTML = "✅ Tiket ditemukan! Verifikasi data Anda.";
        message.className = "message-success";
        
        // Scroll ke form verifikasi
        document.getElementById("verifikasiForm").scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error("Error:", error);
        message.innerHTML = "❌ Error: " + error.message;
        message.className = "message-error";
    }
});

// ======================
// VERIFIKASI DATA
// ======================
document.getElementById("verifBtn").addEventListener("click", function() {
    if (!ticketData) return;
    
    const namaInput = document.getElementById("namaCek").value.trim();
    const hpInput = document.getElementById("hpCek").value.trim();
    const message = document.getElementById("messageCek");
    
    // Validasi input
    if (!namaInput || !hpInput) {
        message.innerHTML = "❌ Harap isi nama dan nomor HP!";
        message.className = "message-error";
        return;
    }
    
    // Cocokkan data (case insensitive untuk nama)
    if (namaInput.toLowerCase() === ticketData.nama.toLowerCase() && 
        hpInput === ticketData.hp) {
        
        // Verifikasi berhasil
        document.getElementById("hasilVerifikasi").style.display = "block";
        
        // Generate QR Code dari code 8 digit
        const qrContainer = document.getElementById("qrCode");
        qrContainer.innerHTML = "";
        
        new QRCode(qrContainer, {
            text: ticketData.code, // Gunakan code 8 digit
            width: 250,
            height: 250,
            colorDark: "#2c3e50",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // Setup download button
        document.getElementById("downloadBtn").onclick = function() {
            downloadQRCode(qrContainer, ticketData.nama, ticketData.code, ticketData.nomorTiket);
        };
        
        message.innerHTML = "✅ Verifikasi berhasil! QR Code ditampilkan.";
        message.className = "message-success";
        
        // Scroll ke hasil
        document.getElementById("hasilVerifikasi").scrollIntoView({ behavior: 'smooth' });
        
    } else {
        message.innerHTML = "❌ Nama atau nomor HP tidak cocok!";
        message.className = "message-error";
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
    newCanvas.height = size + 100;
    
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

// ======================
// AUTO FOCUS
// ======================
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('cekNomorTiket').focus();
});
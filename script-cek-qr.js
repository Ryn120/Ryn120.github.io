// Firebase configuration (same as registration)
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

// Handle ticket search form
document.getElementById("cekForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const noTiket = document.getElementById('cekNomorTiket').value.trim();
    const message = document.getElementById('messageCek');
    message.textContent = "";
    document.getElementById('verifikasiForm').style.display = "none";
    document.getElementById('qrCode').innerHTML = "";
    document.getElementById('downloadBtn').style.display = "none";
    ticketData = null;

    if (!noTiket) {
        message.textContent = "Masukkan nomor tiket terlebih dahulu!";
        message.style.color = "#dc3545";
        return;
    }

    try {
        // Show loading
        message.textContent = "🔍 Mencari tiket...";
        message.style.color = "#17a2b8";

        const snap = await db.collection('peserta').where('nomorTiket', '==', noTiket).get();
        
        if (snap.empty) {
            message.textContent = "❌ Tiket tidak ditemukan!";
            message.style.color = "#dc3545";
            return;
        }
        
        // Get ticket data
        const doc = snap.docs[0];
        ticketData = {
            ...doc.data(),
            id: doc.id
        };

        // Show verification form
        document.getElementById('verifikasiForm').style.display = "block";
        document.getElementById('namaCek').value = "";
        document.getElementById('hpCek').value = "";
        
        message.textContent = "✅ Tiket ditemukan. Silakan verifikasi data.";
        message.style.color = "#28a745";

    } catch (error) {
        console.error("Error:", error);
        message.textContent = "❌ Error mengambil data tiket. Coba lagi.";
        message.style.color = "#dc3545";
    }
});

// Handle verification
document.getElementById("verifBtn").addEventListener("click", function() {
    if (!ticketData) return;
    
    const namaInput = document.getElementById('namaCek').value.trim();
    const hpInput = document.getElementById('hpCek').value.trim();
    const message = document.getElementById('messageCek');

    // Check if inputs are empty
    if (!namaInput || !hpInput) {
        message.textContent = "❌ Harap isi nama dan nomor HP untuk verifikasi!";
        message.style.color = "#dc3545";
        return;
    }

    // Check if data matches
    if (namaInput === ticketData.nama && hpInput === ticketData.hp) {
        // Verification successful
        const qrContainer = document.getElementById("qrCode");
        qrContainer.innerHTML = "";
        
        // Generate QR Code
        new QRCode(qrContainer, {
            text: ticketData.code || ticketData.id,
            width: 200,
            height: 200,
            colorDark: "#2c3e50",
            colorLight: "#ffffff"
        });
        
        // Show download button
        const downloadBtn = document.getElementById("downloadBtn");
        downloadBtn.style.display = "inline";
        downloadBtn.onclick = function() {
            downloadQRCode(qrContainer, ticketData.nama);
        };
        
        message.textContent = "✅ Verifikasi berhasil! QR Code telah ditampilkan.";
        message.style.color = "#28a745";
        
    } else {
        message.textContent = "❌ Nama atau Nomor HP tidak cocok!";
        message.style.color = "#dc3545";
    }
});

// Function to download QR Code
function downloadQRCode(qrContainer, nama) {
    const canvas = qrContainer.querySelector("canvas");
    if (!canvas) {
        alert("QR Code belum siap. Tunggu sebentar.");
        return;
    }

    // Create new canvas with white background
    const newCanvas = document.createElement("canvas");
    const size = 400;
    newCanvas.width = size;
    newCanvas.height = size;

    const ctx = newCanvas.getContext("2d");
    
    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    
    // Draw QR code
    ctx.drawImage(canvas, 50, 50, size - 100, size - 100);
    
    // Add name label
    ctx.fillStyle = "#2c3e50";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(nama, size / 2, 30);
    
    // Add footer text
    ctx.font = "14px Arial";
    ctx.fillStyle = "#7f8c8d";
    ctx.fillText("Tiket Peserta", size / 2, size - 10);

    // Download
    const link = document.createElement("a");
    link.href = newCanvas.toDataURL("image/png");
    link.download = `tiket-${nama.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Auto-focus on page load
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('cekNomorTiket').focus();
});
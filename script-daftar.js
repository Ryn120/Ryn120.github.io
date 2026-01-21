// ======================
// KONFIGURASI FIREBASE
// ======================
var firebaseConfig = {
  apiKey: "AIzaSyDCEU9nyFJi-eSy0Uq3ysXbQlV7Ri4x-Gs",
  authDomain: "qr-generet01.firebaseapp.com",
  projectId: "qr-generet01",
  storageBucket: "qr-generet01.firebasestorage.app",
  messagingSenderId: "753131681292",
  appId: "1:753131681292:web:d7622e7188ba1395e8a029"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

// ======================
// GENERATE KODE UNIK
// ======================
function generateUniqueCode() {
  // Buat kode 8 digit acak
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ======================
// HANDLE FORM DAFTAR
// ======================
document.getElementById("daftarForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const nama = document.getElementById("nama").value.trim();
  const nomorTiket = document.getElementById("nomorTiket").value.trim();
  const email = document.getElementById("email").value.trim();
  const hp = document.getElementById("hp").value.trim();

  const messageDiv = document.getElementById("message");
  messageDiv.textContent = "";
  messageDiv.className = "";

  // Validasi input kosong
  if (!nama || !nomorTiket || !email || !hp) {
    messageDiv.textContent = "❌ Semua data wajib diisi!";
    messageDiv.className = "message-error";
    return;
  }

  try {
    // ======================
    // CEK DUPLIKASI
    // ======================
    const [tiketSnap, emailSnap, hpSnap] = await Promise.all([
      db.collection("peserta").where("nomorTiket", "==", nomorTiket).get(),
      db.collection("peserta").where("email", "==", email).get(),
      db.collection("peserta").where("hp", "==", hp).get()
    ]);

    if (!tiketSnap.empty) {
      messageDiv.textContent = "❌ Nomor tiket sudah terdaftar!";
      messageDiv.className = "message-error";
      return;
    }
    if (!emailSnap.empty) {
      messageDiv.textContent = "❌ Email sudah terdaftar!";
      messageDiv.className = "message-error";
      return;
    }
    if (!hpSnap.empty) {
      messageDiv.textContent = "❌ Nomor HP sudah terdaftar!";
      messageDiv.className = "message-error";
      return;
    }

    // ======================
    // GENERATE KODE UNIK
    // ======================
    let code;
    let isUnique = false;
    
    // Coba hingga 5 kali untuk mendapatkan kode unik
    for (let i = 0; i < 5; i++) {
      code = generateUniqueCode();
      const codeSnap = await db.collection("peserta").where("code", "==", code).get();
      if (codeSnap.empty) {
        isUnique = true;
        break;
      }
    }
    
    if (!isUnique) {
      // Gunakan timestamp sebagai fallback
      code = 'T' + Date.now().toString().slice(-8);
    }

    // ======================
    // SIMPAN DATA KE FIREBASE
    // ======================
    const pesertaData = {
      nama: nama,
      nomorTiket: nomorTiket,
      email: email,
      hp: hp,
      code: code, // SIMPAN KODE YANG SAMA!
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      source: "daftar-web"
    };

    // Simpan dengan ID yang sama dengan code untuk memudahkan pencarian
    await db.collection("peserta").doc(code).set(pesertaData);

    messageDiv.textContent = "✅ Pendaftaran berhasil! Kode Anda: " + code;
    messageDiv.className = "message-success";

    // ======================
    // GENERATE QR CODE
    // ======================
    const qrContainer = document.getElementById("qrCode");
    qrContainer.innerHTML = "";
    
    // PASTIKAN menggunakan kode yang sama!
    new QRCode(qrContainer, {
      text: code,
      width: 250,
      height: 250,
      colorDark: "#2c3e50",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

    // ======================
    // DOWNLOAD QR CODE
    // ======================
    const downloadBtn = document.getElementById("downloadBtn");
    downloadBtn.style.display = "inline-block";
    downloadBtn.onclick = function () {
      downloadQRCode(qrContainer, nama, code, nomorTiket);
    };

    // ======================
    // RESET FORM
    // ======================
    document.getElementById("daftarForm").reset();

  } catch (error) {
    console.error("Error:", error);
    messageDiv.textContent = "❌ Terjadi kesalahan: " + error.message;
    messageDiv.className = "message-error";
  }
});

// ======================
// FUNGSI DOWNLOAD QR
// ======================
function downloadQRCode(qrContainer, nama, code, nomorTiket) {
  const canvas = qrContainer.querySelector("canvas");
  
  if (!canvas) {
    alert("QR Code belum siap. Tunggu sebentar.");
    return;
  }

  // Buat canvas baru dengan ukuran lebih besar
  const newCanvas = document.createElement("canvas");
  const size = 500; // Ukuran besar untuk kualitas baik
  newCanvas.width = size;
  newCanvas.height = size + 80; // Tambahan untuk teks

  const ctx = newCanvas.getContext("2d");
  
  // Background putih
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
  
  // Gambar QR Code di tengah
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
  
  // Tambahkan border
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

// ======================
// INISIALISASI HALAMAN
// ======================
document.addEventListener('DOMContentLoaded', function() {
  console.log("Halaman pendaftaran siap");
});
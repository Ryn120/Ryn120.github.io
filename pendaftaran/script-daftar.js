// Konfigurasi Firebase (ganti dengan milik Anda)
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

// Tangani submit formulir pendaftaran
document.getElementById("daftarForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  var nama = document.getElementById('nama').value.trim();
  var nomorTiket = document.getElementById('nomorTiket').value.trim();
  var email = document.getElementById('email').value.trim();
  var hp = document.getElementById('hp').value.trim();
  var messageDiv = document.getElementById('message');
  messageDiv.textContent = "";

  // Cek duplikasi: nomor tiket, email, atau HP sudah terdaftar?
  try {
    // Query Firestore untuk setiap bidang
    var tiketSnap = await db.collection('peserta').where('nomorTiket', '==', nomorTiket).get();
    if (!tiketSnap.empty) {
      messageDiv.textContent = "Nomor tiket sudah terdaftar!";
      return;
    }
    var emailSnap = await db.collection('peserta').where('email', '==', email).get();
    if (!emailSnap.empty) {
      messageDiv.textContent = "Email sudah terdaftar!";
      return;
    }
    var hpSnap = await db.collection('peserta').where('hp', '==', hp).get();
    if (!hpSnap.empty) {
      messageDiv.textContent = "Nomor HP sudah terdaftar!";
      return;
    }

    // Tidak ada duplikasi, simpan data ke Firestore
    var newDocRef = db.collection('peserta').doc(); // buat doc baru dengan ID otomatis
    var kodeUnik = newDocRef.id; // gunakan ID dokumen sebagai kode unik
    await newDocRef.set({
      nama: nama,
      nomorTiket: nomorTiket,
      email: email,
      hp: hp,
      kodeUnik: kodeUnik
    });

    // Tampilkan pesan sukses
    messageDiv.textContent = "Pendaftaran berhasil!";

    // Generate QR Code dari kodeUnik
    var qrContainer = document.getElementById("qrCode");
    // Hapus QR lama jika ada
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: kodeUnik,
      width: 200,
      height: 200
    });

    // Tampilkan tombol download QR
    var downloadBtn = document.getElementById("downloadBtn");
    downloadBtn.style.display = "inline";
    downloadBtn.onclick = function() {
      // Cari <img> atau <canvas> di dalam qrContainer
      var imgTag = qrContainer.querySelector("img");
      if (imgTag) {
        // Jika QRCode.js menghasilkan <img>, gunakan src-nya
        var imgSrc = imgTag.src;
        var a = document.createElement('a');
        a.href = imgSrc;
        a.download = 'kode-tiket.png';
        a.click();
      } else {
        // Jika menggunakan <canvas>, konversi ke data URL
        var canvas = qrContainer.querySelector("canvas");
        var imgSrc = canvas.toDataURL("image/png");
        var a = document.createElement('a');
        a.href = imgSrc;
        a.download = 'kode-tiket.png';
        a.click();
      }
    };

  } catch (error) {
    console.error("Error: ", error);
    messageDiv.textContent = "Terjadi kesalahan. Coba lagi.";
  }
});
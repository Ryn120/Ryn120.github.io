// Konfigurasi Firebase (sama dengan sebelumnya)
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

var ticketData = null; // Menyimpan data tiket yang ditemukan

// Tangani submit pencarian tiket
document.getElementById("cekForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  var noTiket = document.getElementById('cekNomorTiket').value.trim();
  var message = document.getElementById('messageCek');
  message.textContent = "";
  document.getElementById('verifikasiForm').style.display = "none";
  document.getElementById('qrCode').innerHTML = "";
  document.getElementById('downloadBtn').style.display = "none";
  ticketData = null;

  try {
    var snap = await db.collection('peserta').where('nomorTiket', '==', noTiket).get();
    if (snap.empty) {
      message.textContent = "Tiket tidak ditemukan!";
      return;
    }
    // Ambil data tiket (asumsikan satu dokumen)
    ticketData = snap.docs[0].data();

    // Tampilkan form verifikasi
    document.getElementById('verifikasiForm').style.display = "block";
    document.getElementById('messageCek').textContent = "Tiket ditemukan. Silakan verifikasi data.";
  } catch (error) {
    console.error(error);
    message.textContent = "Error mengambil data tiket.";
  }
});

// Tangani verifikasi nama dan HP
document.getElementById("verifBtn").addEventListener("click", function() {
  if (!ticketData) return;
  var namaInput = document.getElementById('namaCek').value.trim();
  var hpInput = document.getElementById('hpCek').value.trim();
  var message = document.getElementById('messageCek');
  message.textContent = "";

  // Cek kecocokan
  if (namaInput === ticketData.nama && hpInput === ticketData.hp) {
    // Verifikasi berhasil, tampilkan QR Code
    var qrContainer = document.getElementById("qrCode");
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: ticketData.kodeUnik,
      width: 200,
      height: 200
    });
    // Tampilkan tombol download
    var downloadBtn = document.getElementById("downloadBtn");
    downloadBtn.style.display = "inline";
    downloadBtn.onclick = function() {
      var imgTag = qrContainer.querySelector("img");
      if (imgTag) {
        var imgSrc = imgTag.src;
        var a = document.createElement('a');
        a.href = imgSrc;
        a.download = 'kode-tiket.png';
        a.click();
      } else {
        var canvas = qrContainer.querySelector("canvas");
        var imgSrc = canvas.toDataURL("image/png");
        var a = document.createElement('a');
        a.href = imgSrc;
        a.download = 'kode-tiket.png';
        a.click();
      }
    };
  } else {
    message.textContent = "Nama atau Nomor HP tidak cocok!";
  }
});
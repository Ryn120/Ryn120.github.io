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

// Inisialisasi Firebase (v8)
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

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

  // Validasi input kosong
  if (!nama || !nomorTiket || !email || !hp) {
    messageDiv.textContent = "Semua data wajib diisi!";
    return;
  }

  try {
    // ======================
    // CEK DUPLIKASI (PARALEL)
    // ======================
    const [tiketSnap, emailSnap, hpSnap] = await Promise.all([
      db.collection("peserta").where("nomorTiket", "==", nomorTiket).get(),
      db.collection("peserta").where("email", "==", email).get(),
      db.collection("peserta").where("hp", "==", hp).get()
    ]);

    if (!tiketSnap.empty) {
      messageDiv.textContent = "Nomor tiket sudah terdaftar!";
      return;
    }
    if (!emailSnap.empty) {
      messageDiv.textContent = "Email sudah terdaftar!";
      return;
    }
    if (!hpSnap.empty) {
      messageDiv.textContent = "Nomor HP sudah terdaftar!";
      return;
    }

    // ======================
    // SIMPAN DATA
    // ======================
    const docRef = db.collection("peserta").doc();
    const code = docRef.id;

    await docRef.set({
      nama,
      nomorTiket,
      email,
      hp,
      code,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    messageDiv.textContent = "Pendaftaran berhasil!";

    // ======================
    // GENERATE QR
    // ======================
    const qrContainer = document.getElementById("qrCode");
    qrContainer.innerHTML = "";

    new QRCode(qrContainer, {
      text: code,
      width: 200,
      height: 200
    });

    // ======================
    // DOWNLOAD QR
    // ======================
    const downloadBtn = document.getElementById("downloadBtn");
    downloadBtn.style.display = "inline-block";

    downloadBtn.onclick = function () {
      const img = qrContainer.querySelector("img");
      const canvas = qrContainer.querySelector("canvas");

      let imgSrc = "";

      if (img) {
        imgSrc = img.src;
      } else if (canvas) {
        imgSrc = canvas.toDataURL("image/png");
      } else {
        alert("QR belum siap, coba lagi.");
        return;
      }

      const a = document.createElement("a");
      a.href = imgSrc;
      a.download = "qr-tiket.png";
      a.click();
    };

  } catch (error) {
    console.error(error);
    messageDiv.textContent = "Terjadi kesalahan. Silakan coba lagi.";
  }
});
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc,
  query, where, or, getDocs, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// FIREBASE
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
const pesertaRef = collection(db, "peserta");

// ELEMENT
const menu = document.getElementById("menuAksi");
const formDaftar = document.getElementById("formDaftar");
const formCek = document.getElementById("formCek");
const formVerif = document.getElementById("formVerif");
const hasil = document.getElementById("hasil");
const qrBox = document.getElementById("qrcode");

let dataPeserta = null;

// ===== MENU =====
btnDaftar.onclick = () => show(formDaftar);
btnLihat.onclick = () => show(formCek);

function show(el) {
  [menu, formDaftar, formCek, formVerif, hasil].forEach(e => e.style.display = "none");
  el.style.display = "block";
}

// ===== DAFTAR =====
formDaftar.onsubmit = async (e) => {
  e.preventDefault();

  const nama = namaInput.value.trim();
  const nomorTiket = nomorTiket.value.trim();
  const email = emailInput.value.trim();
  const hp = hpInput.value.trim();

  const q = query(
    pesertaRef,
    or(
      where("nomorTiket", "==", nomorTiket),
      where("email", "==", email),
      where("hp", "==", hp)
    ),
    limit(1)
  );

  const cek = await getDocs(q);
  if (!cek.empty) return alert("Data sudah terdaftar");

  const code = Math.floor(10000000 + Math.random() * 90000000).toString();

  await addDoc(pesertaRef, { nama, nomorTiket, email, hp, code });

  tampilQR(code, nomorTiket);
};

// ===== CEK TIKET =====
formCek.onsubmit = async (e) => {
  e.preventDefault();
  const tiket = cekTiket.value.trim();

  const q = query(pesertaRef, where("nomorTiket", "==", tiket), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) return alert("Tiket tidak ditemukan");

  dataPeserta = snap.docs[0].data();
  show(formVerif);
};

// ===== VERIFIKASI =====
formVerif.onsubmit = (e) => {
  e.preventDefault();

  if (
    verifNama.value.trim().toLowerCase() !== dataPeserta.nama.toLowerCase() ||
    verifHp.value.trim() !== dataPeserta.hp
  ) {
    return alert("Verifikasi gagal");
  }

  tampilQR(dataPeserta.code, dataPeserta.nomorTiket);
};

// ===== QR =====
function tampilQR(code, tiket) {
  show(hasil);
  qrBox.innerHTML = "";

  new QRCode(qrBox, { text: code, width: 200, height: 200 });

  downloadQR.onclick = () => {
    const img = qrBox.querySelector("img");
    const link = document.createElement("a");
    link.href = img.src;
    link.download = `QR-${tiket}.png`;
    link.click();
  };
}
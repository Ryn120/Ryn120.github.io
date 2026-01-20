// script.js (perbaikan)
// NOTE: file ini harus di-include sebagai <script type="module" src="script.js"></script>
// dan dimuat setelah DOM (biasanya di bottom of body)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc,
  query, where, or, getDocs, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIG FIREBASE (sama seperti sebelumnya) ---
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

// --- Ambil elemen DOM (pastikan ID di index.html sesuai) ---
const menu = document.getElementById("menuAksi");
const btnDaftar = document.getElementById("btnDaftar");
const btnLihat = document.getElementById("btnLihat");

const formDaftar = document.getElementById("formDaftar");
const formCek = document.getElementById("formCek");
const formVerif = document.getElementById("formVerif");
const hasil = document.getElementById("hasil");

const qrBox = document.getElementById("qrcode");
const downloadQR = document.getElementById("downloadQR");

// inputs daftar
const namaInput = document.getElementById("nama");
const nomorInput = document.getElementById("nomorTiket");
const emailInput = document.getElementById("email");
const hpInput = document.getElementById("hp");

// inputs cek/verif
const cekTiketInput = document.getElementById("cekTiket");
const verifNamaInput = document.getElementById("verifNama");
const verifHpInput = document.getElementById("verifHp");

let dataPeserta = null;

// Safety: cek elemen penting ada
if (!btnDaftar || !btnLihat || !formDaftar || !formCek || !formVerif || !hasil) {
  console.error("Beberapa elemen DOM tidak ditemukan. Periksa ID pada index.html.");
}

// ===== Fungsi bantu tampilkan elemen =====
function hideAll() {
  if (menu) menu.style.display = "none";
  if (formDaftar) formDaftar.style.display = "none";
  if (formCek) formCek.style.display = "none";
  if (formVerif) formVerif.style.display = "none";
  if (hasil) hasil.style.display = "none";
}

function show(el) {
  hideAll();
  if (el) el.style.display = "block";
}

// Pasang event menu (cek null)
if (btnDaftar) btnDaftar.addEventListener("click", () => show(formDaftar));
if (btnLihat) btnLihat.addEventListener("click", () => show(formCek));

// ===== Form DAFTAR =====
if (formDaftar) {
  formDaftar.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const nama = (namaInput?.value || "").trim();
      const nomorTiket = (nomorInput?.value || "").trim();
      const email = (emailInput?.value || "").trim();
      const hp = (hpInput?.value || "").trim();

      if (!nama || !nomorTiket || !email || !hp) {
        alert("Isi semua field pendaftaran.");
        return;
      }

      // disable button submit (cari button di form)
      const submitBtn = formDaftar.querySelector("button[type='submit']");
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Memproses..."; }

      // cek duplikat (OR query) limit 1
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
      if (!cek.empty) {
        alert("Data sudah terdaftar (tiket/email/hp).");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Daftar & Buat QR"; }
        return;
      }

      const code = Math.floor(10000000 + Math.random() * 90000000).toString();

      await addDoc(pesertaRef, { nama, nomorTiket, email, hp, code, createdAt: new Date() });

      // tampil QR langsung
      tampilQR(code, nomorTiket);

      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Daftar & Buat QR"; }
    } catch (err) {
      console.error("Error daftar:", err);
      alert("Terjadi kesalahan saat pendaftaran: " + (err.message || err));
      const submitBtn = formDaftar.querySelector("button[type='submit']");
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Daftar & Buat QR"; }
    }
  });
}

// ===== Form CEK TIKET =====
if (formCek) {
  formCek.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const tiket = (cekTiketInput?.value || "").trim();
      if (!tiket) { alert("Masukkan nomor tiket."); return; }

      const q = query(pesertaRef, where("nomorTiket", "==", tiket), limit(1));
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("Tiket tidak ditemukan.");
        return;
      }

      dataPeserta = snap.docs[0].data();
      show(formVerif);
    } catch (err) {
      console.error("Error cek tiket:", err);
      alert("Terjadi kesalahan saat mencari tiket.");
    }
  });
}

// ===== Form VERIFIKASI =====
if (formVerif) {
  formVerif.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      const nama = (verifNamaInput?.value || "").trim().toLowerCase();
      const hp = (verifHpInput?.value || "").trim();

      if (!dataPeserta) { alert("Data tiket belum dimuat."); return; }

      if (nama !== (dataPeserta.nama || "").toLowerCase() || hp !== (dataPeserta.hp || "")) {
        alert("Verifikasi gagal: nama atau HP tidak cocok.");
        return;
      }

      tampilQR(dataPeserta.code, dataPeserta.nomorTiket);
    } catch (err) {
      console.error("Error verifikasi:", err);
      alert("Terjadi kesalahan saat verifikasi.");
    }
  });
}

// ===== Fungsi tampil QR & download =====
function tampilQR(code, tiket) {
  show(hasil);
  if (!qrBox) { alert("Kontainer QR tidak ditemukan."); return; }
  qrBox.innerHTML = "";

  new QRCode(qrBox, {
    text: code,
    width: 200,
    height: 200,
    correctLevel: QRCode.CorrectLevel.H
  });

  if (downloadQR) {
    downloadQR.onclick = () => {
      const img = qrBox.querySelector("img");
      const canvas = qrBox.querySelector("canvas");
      const link = document.createElement("a");

      if (img && img.src) link.href = img.src;
      else if (canvas) link.href = canvas.toDataURL("image/png");
      else { alert("Gagal mengambil gambar QR."); return; }

      link.download = `QR-${tiket}.png`;
      link.click();
    };
  }
}
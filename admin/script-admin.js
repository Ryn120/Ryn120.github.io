// ======================
// KONFIGURASI FIREBASE (v8)
// ======================
var firebaseConfig = {
  apiKey: "AIzaSyDCEU9nyFJi-eSy0Uq3ysXbQlV7Ri4x-Gs",
  authDomain: "qr-generet01.firebaseapp.com",
  projectId: "qr-generet01",
  storageBucket: "qr-generet01.firebasestorage.app",
  messagingSenderId: "753131681292",
  appId: "1:753131681292:web:d7622e7188ba1395e8a029"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();
var dbCollection = "peserta";

const tableBody = document.getElementById("tableBody");
let globalData = [];

// ======================
// REALTIME DATABASE
// ======================
if (tableBody) {
  db.collection(dbCollection).onSnapshot(snapshot => {
    globalData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderTable(globalData);
  });
}

// ======================
// RENDER TABEL
// ======================
function renderTable(dataArray) {
  tableBody.innerHTML = "";

  dataArray.forEach(user => {
    tableBody.innerHTML += `
      <tr>
        <td><div id="qr-${user.code}"></div></td>
        <td><b>${user.code}</b></td>
        <td>${user.nama}</td>
        <td>${user.nomorTiket || "-"}</td>
        <td>${user.email}</td>
        <td>${user.hp || "-"}</td>
        <td><button onclick="hapusData('${user.id}')">Hapus</button></td>
      </tr>
    `;
  });

  // Generate QR di tabel
  dataArray.forEach(user => {
    const el = document.getElementById(`qr-${user.code}`);
    if (el) {
      el.innerHTML = "";
      new QRCode(el, { text: user.code, width: 60, height: 60 });
    }
  });
}

// ======================
// HAPUS DATA
// ======================
async function hapusData(id) {
  if (!confirm("Hapus data ini secara permanen?")) return;
  try {
    await db.collection(dbCollection).doc(id).delete();
  } catch (err) {
    alert("Gagal menghapus data");
  }
}

// ======================
// SEARCH
// ======================
function searchData() {
  const term = document.getElementById("searchInput").value.toLowerCase();
  const filtered = globalData.filter(u =>
    u.nama.toLowerCase().includes(term) ||
    u.code.toLowerCase().includes(term) ||
    (u.nomorTiket && u.nomorTiket.includes(term))
  );
  renderTable(filtered);
}

// ======================
// SORT A-Z
// ======================
function sortData() {
  globalData.sort((a, b) => a.nama.localeCompare(b.nama));
  renderTable(globalData);
}

// ======================
// SCAN QR
// ======================
const reader = document.getElementById("reader");
if (reader && typeof Html5QrcodeScanner !== "undefined") {
  const onScanSuccess = async decodedText => {
    const snap = await db
      .collection(dbCollection)
      .where("code", "==", decodedText)
      .get();

    if (!snap.empty) {
      const user = snap.docs[0].data();
      document.getElementById("scanResult").style.display = "block";
      document.getElementById("resNama").innerText = user.nama;
      document.getElementById("resKode").innerText = user.code;
      alert("✅ Data Valid: " + user.nama);
    } else {
      alert("❌ Data Tidak Ditemukan!");
    }
  };

  new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 })
    .render(onScanSuccess);
}
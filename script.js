// --- FUNGSI GLOBAL: Mengambil Data dari LocalStorage ---
function getData() {
    return JSON.parse(localStorage.getItem('pesertaData')) || [];
}

function saveData(data) {
    localStorage.setItem('pesertaData', JSON.stringify(data));
}

// --- LOGIKA HALAMAN PENDAFTARAN (index.html) ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        let nama = document.getElementById('nama').value;
        let nomorId = document.getElementById('nomorId').value;
        let email = document.getElementById('email').value;
        let hp = document.getElementById('hp').value;

        let data = getData();

        // 1. Cek Duplikasi (Validasi)
        let isDuplicate = data.some(user => 
            user.nomorId === nomorId || user.email === email || user.hp === hp
        );

        if (isDuplicate) {
            alert("Gagal! Nomor ID, Email, atau No HP sudah terdaftar.");
            return;
        }

        // 2. Generate 8 Angka Random
        let randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
        
        // Pastikan kode benar-benar unik (opsional tapi disarankan)
        while(data.some(user => user.code === randomCode)) {
            randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
        }

        // 3. Simpan Data
        let newUser = { code: randomCode, nama, nomorId, email, hp };
        data.push(newUser);
        saveData(data);

        // 4. Tampilkan Hasil & QR Code
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('resultArea').style.display = 'block';
        document.getElementById('uniqueCode').innerText = randomCode;

        // Generate gambar QR
        new QRCode(document.getElementById("qrcode"), {
            text: randomCode,
            width: 128,
            height: 128
        });

        alert("Pendaftaran Berhasil!");
    });
}

// --- LOGIKA HALAMAN ADMIN (admin.html) ---
const tableBody = document.querySelector('#dataTable tbody');
if (tableBody) {
    renderTable(getData());
}

function renderTable(dataArray) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    dataArray.forEach((user, index) => {
        let row = `<tr>
            <td>${user.code}</td>
            <td>${user.nama}</td>
            <td>${user.nomorId}</td>
            <td>${user.email}</td>
            <td>${user.hp}</td>
            <td><button class="btn-delete" onclick="deleteUser('${user.code}')">Hapus</button></td>
        </tr>`;
        tableBody.innerHTML += row;
    });
}

// Fungsi Sorting (A-Z berdasarkan Nama)
function sortData() {
    let data = getData();
    data.sort((a, b) => a.nama.localeCompare(b.nama));
    renderTable(data);
}

// Fungsi Pencarian
function searchData() {
    let input = document.getElementById('searchInput').value.toLowerCase();
    let data = getData();
    let filtered = data.filter(user => 
        user.nama.toLowerCase().includes(input) || 
        user.code.includes(input)
    );
    renderTable(filtered);
}

// Fungsi Hapus Per User
window.deleteUser = function(code) {
    if(confirm('Yakin ingin menghapus data ini?')) {
        let data = getData();
        let newData = data.filter(user => user.code !== code);
        saveData(newData);
        renderTable(newData);
    }
}

// Fungsi Hapus Semua
window.clearAllData = function() {
    if(confirm('PERINGATAN: Semua data akan dihapus permanen!')) {
        localStorage.removeItem('pesertaData');
        renderTable([]);
    }
}

// --- LOGIKA HALAMAN SCAN (scan.html) ---
const readerElement = document.getElementById('reader');
if (readerElement) {
    function onScanSuccess(decodedText, decodedResult) {
        // Matikan kamera setelah scan berhasil
        html5QrcodeScanner.clear(); 
        
        let data = getData();
        let foundUser = data.find(user => user.code === decodedText);

        if (foundUser) {
            document.getElementById('scanResult').style.display = 'block';
            document.getElementById('scanResult').style.borderColor = '#28a745'; // Hijau
            document.getElementById('resNama').innerText = foundUser.nama;
            document.getElementById('resKode').innerText = foundUser.code;
            alert("Data Ditemukan: " + foundUser.nama);
        } else {
            alert("Data TIDAK ditemukan di database!");
            // Reload halaman untuk scan lagi
            location.reload(); 
        }
    }

    let html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", { fps: 10, qrbox: 250 });
    html5QrcodeScanner.render(onScanSuccess);
}

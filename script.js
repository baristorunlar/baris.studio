// Şifreleri güvenli bir şekilde sakla (Base64 ile şifrelenmiş)
const ADMIN_HASH = "NzU1OA=="; // "7558" şifrelenmiş hali
const GUEST_HASH = "NTU0NA=="; // "5544" şifrelenmiş hali

// Şifre kontrolü için yardımcı fonksiyon
function checkPassword(input, hash) {
    try {
        return btoa(input) === hash;
    } catch (e) {
        return false;
    }
}

// Şifreleme fonksiyonu
function encrypt(text) {
    return btoa(text);
}

// Şifre çözme fonksiyonu
function decrypt(text) {
    return atob(text);
}

// Global değişkenler
let isAuthenticated = false;
let currentPassword = '';
let isGuestUser = false;
let loginAttempts = 0;
let lastLoginAttempt = 0;
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_TIME = 300000; // 5 dakika (milisaniye cinsinden)

// Bildirim fonksiyonu
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

let deleteCallback = null;

// Onay modalını göster
function showConfirmModal(message, callback) {
    const modal = document.getElementById('confirmModal');
    const messageElement = document.getElementById('confirmMessage');
    messageElement.textContent = message;
    modal.style.display = 'block';

    // Global callback'i ayarla
    window.confirmCallback = async (confirmed) => {
        modal.style.display = 'none';
        if (confirmed) {
            await callback();
        }
    };
}

// Onay sonucunu işle
async function confirmDelete(confirmed) {
    if (window.confirmCallback) {
        await window.confirmCallback(confirmed);
    }
}

// Şifreleri karıştırma fonksiyonu (basit bir örnek)
function hashPassword(password) {
    return btoa(password.split('').reverse().join(''));
}

// Login fonksiyonu
async function login() {
    const loginButton = document.querySelector('#loginSection button');
    const password = document.getElementById('password').value;
    
    try {
        // Giriş denemesi kontrolü
        const currentTime = Date.now();
        if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            const timeLeft = LOCKOUT_TIME - (currentTime - lastLoginAttempt);
            if (timeLeft > 0) {
                const minutesLeft = Math.ceil(timeLeft / 60000);
                showNotification(`Çok fazla hatalı giriş. ${minutesLeft} dakika bekleyin.`, 'error');
                return;
            } else {
                loginAttempts = 0;
            }
        }

        if(password.trim() === '') {
            showNotification('Lütfen şifre giriniz!', 'error');
            return;
        }
        
        loginButton.classList.add('loading');
        loginButton.textContent = 'Giriş Yapılıyor';
        loginButton.disabled = true;

        const userCredential = await firebase.auth().signInAnonymously();
        
        // Şifre kontrolü
        if (checkPassword(password, ADMIN_HASH)) { // Admin şifresi
            loginAttempts = 0;
            isAuthenticated = true;
            currentPassword = password;
            isGuestUser = false;
            
            await userCredential.user.updateProfile({
                displayName: 'admin-notes'
            });
            
            showNotification('Yönetici olarak giriş yapıldı!', 'success');
        } else if (checkPassword(password, GUEST_HASH)) { // Misafir şifresi
            loginAttempts = 0;
            isAuthenticated = true;
            currentPassword = password;
            isGuestUser = true;
            
            await userCredential.user.updateProfile({
                displayName: 'guest-notes'
            });
            
            showNotification('Misafir olarak giriş yapıldı!', 'success');
        } else {
            // Hatalı giriş
            loginAttempts++;
            lastLoginAttempt = currentTime;
            
            const attemptsLeft = MAX_LOGIN_ATTEMPTS - loginAttempts;
            await firebase.auth().signOut();
            
            if (attemptsLeft > 0) {
                showNotification(`Hatalı şifre! ${attemptsLeft} deneme hakkınız kaldı.`, 'error');
            } else {
                showNotification('Çok fazla hatalı giriş. 5 dakika bekleyin.', 'error');
            }
            
            document.getElementById('password').value = '';
            return;
        }
        
        // Başarılı giriş işlemleri...
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('notesSection').style.display = 'block';
        
        if (isGuestUser) {
            document.getElementById('adminPanel').style.display = 'none';
            document.querySelector('.add-note-btn').style.display = 'none';
        }
        
        loadNotes();
        updateAdminStats();
        localStorage.setItem('lastLoginTime', new Date().toISOString());
        
    } catch(e) {
        console.error('Giriş hatası:', e);
        showNotification('Giriş yapılırken bir hata oluştu!', 'error');
    } finally {
        loginButton.classList.remove('loading');
        loginButton.textContent = 'Giriş Yap';
        loginButton.disabled = false;
    }
}

// Not kaydetme fonksiyonu
async function saveNote() {
    try {
        // Auth kontrolü
        const user = firebase.auth().currentUser;
        if (!user) {
            showNotification('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın!', 'error');
            return;
        }

        const noteInput = document.getElementById('noteInput');
        const noteTitle = document.getElementById('noteTitle');
        const noteLink = document.getElementById('noteLink');
        const category = document.getElementById('noteCategory').value;
        
        if(noteTitle.value.trim() === '') {
            showNotification('Lütfen bir başlık girin!', 'error');
            return;
        }

        if(noteInput.value.trim() === '') {
            showNotification('Lütfen bir not girin!', 'error');
            return;
        }

        // Türkçe karakterleri ve boşlukları güvenli hale getir
        const safeTitle = encodeURIComponent(noteTitle.value.trim());
        const safeText = encodeURIComponent(noteInput.value.trim());
        const safeLink = noteLink.value.trim();

        const noteData = {
            title: noteTitle.value.trim(),
            text: noteInput.value.trim(),
            link: safeLink,
            category: category,
            date: new Date().toISOString(),
            encrypted: encrypt(JSON.stringify({
                title: safeTitle,
                text: safeText,
                link: safeLink
            })),
            userId: user.uid // Kullanıcı ID'sini ekle
        };

        // Firebase'e kaydet
        await db.collection('notes').add(noteData);
        
        // Form temizleme
        noteInput.value = '';
        noteTitle.value = '';
        noteLink.value = '';
        
        loadNotes();
        updateAdminStats();
        showNotification('Not başarıyla kaydedildi!', 'success');
    } catch(e) {
        console.error('Not kaydetme hatası:', e);
        showNotification('Not kaydedilirken bir hata oluştu!', 'error');
    }
}

// Not silme fonksiyonu
async function deleteNote(id) {
    try {
        showConfirmModal('Bu notu silmek istediğinizden emin misiniz?', async () => {
            await db.collection('notes').doc(id).delete();
            loadNotes();
            updateAdminStats();
            showNotification('Not başarıyla silindi!', 'success');
        });
    } catch(e) {
        console.error('Silme hatası:', e);
        showNotification('Not silinirken bir hata oluştu!', 'error');
    }
}

// Tüm notları silme fonksiyonu
async function clearAllNotes() {
    try {
        // Firestore'dan tüm notları al
        const snapshot = await db.collection('notes').get();
        
        if (snapshot.empty) {
            showNotification('Silinecek not bulunamadı!', 'error');
            return;
        }

        showConfirmModal(`Toplam ${snapshot.size} notu silmek istediğinizden emin misiniz?`, async () => {
            try {
                // Batch işlemi başlat
                const batch = db.batch();
                
                // Her notu batch'e ekle
                snapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                
                // Batch'i uygula
                await batch.commit();
                
                loadNotes();
                updateAdminStats();
                showNotification('Tüm notlar başarıyla silindi!', 'success');
            } catch(e) {
                console.error('Toplu silme hatası:', e);
                showNotification('Notlar silinirken bir hata oluştu!', 'error');
            }
        });
    } catch(e) {
        console.error('Toplu silme hatası:', e);
        showNotification('Notlar silinirken bir hata oluştu!', 'error');
    }
}

// Notları yükleme fonksiyonu
async function loadNotes() {
    const notesList = document.getElementById('notesList');
    const filterCategory = document.getElementById('filterCategory').value;
    notesList.innerHTML = '';
    
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('Kullanıcı oturumu bulunamadı');
            return;
        }

        const snapshot = await db.collection('notes')
            .orderBy('date', 'desc')
            .get();

        if (snapshot.empty) {
            notesList.innerHTML = '<div class="no-notes">Henüz not eklenmemiş</div>';
            return;
        }

        snapshot.forEach(doc => {
            try {
                const note = doc.data();
                
                if (filterCategory !== 'hepsi' && note.category !== filterCategory) {
                    return;
                }

                const decryptedData = JSON.parse(decrypt(note.encrypted));
                const title = decodeURIComponent(decryptedData.title || '');
                const text = decodeURIComponent(decryptedData.text || '');
                
                const noteDiv = document.createElement('div');
                noteDiv.className = `note ${note.category}`;
                
                // Misafir kullanıcı için düzenleme ve silme butonlarını gizle
                const actionButtons = !isGuestUser ? `
                    <div class="note-actions">
                        <button class="edit-btn" onclick="editNote('${doc.id}')">
                            <span>✏️</span>
                            <span>Düzenle</span>
                        </button>
                        <button class="delete-btn" onclick="deleteNote('${doc.id}')">
                            <span>🗑️</span>
                        </button>
                    </div>
                ` : '';
                
                noteDiv.innerHTML = `
                    <div class="note-header">
                        <div class="note-header-left">
                            <h4 class="note-title">${title}</h4>
                            <span class="note-category ${note.category}">${getCategoryName(note.category)}</span>
                        </div>
                        <div class="note-date">${formatDate(note.date)}</div>
                    </div>
                    <div class="note-content">${text}</div>
                    ${decryptedData.link ? `
                        <div class="note-link">
                            <a href="${decryptedData.link}" target="_blank" rel="noopener noreferrer">
                                <span>🔗</span>
                                <span>Bağlantıya Git</span>
                            </a>
                        </div>
                    ` : ''}
                    ${actionButtons}
                `;

                notesList.appendChild(noteDiv);
            } catch(e) {
                console.error('Not işleme hatası:', e);
            }
        });
    } catch(e) {
        console.error('Notları yükleme hatası:', e);
        showNotification('Notlar yüklenirken bir hata oluştu!', 'error');
    }
}

// Tarih formatı
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Kategori isimleri
function getCategoryName(category) {
    const categories = {
        'genel': 'Genel',
        'kisisel': 'Kişisel',
        'is': 'İş',
        'onemli': 'Önemli'
    };
    return categories[category] || category;
}

// İstatistikleri güncelleme
async function updateAdminStats() {
    try {
        const snapshot = await db.collection('notes').get();
        const notes = [];
        let totalSize = 0;
        let lastNoteDate = null;

        // Her notu işle
        snapshot.forEach(doc => {
            const note = doc.data();
            notes.push(note);
            
            // Not boyutunu hesapla (yaklaşık)
            const noteSize = JSON.stringify(note).length;
            totalSize += noteSize;

            // Son not tarihini güncelle
            const noteDate = new Date(note.date);
            if (!lastNoteDate || noteDate > lastNoteDate) {
                lastNoteDate = noteDate;
            }
        });

        // İstatistikleri güncelle
        document.getElementById('totalNotes').textContent = notes.length;
        document.getElementById('lastNoteDate').textContent = lastNoteDate ? 
            formatDate(lastNoteDate).split(',')[0] : '-';
        
        // Veritabanı boyutunu formatla
        const sizeInKB = (totalSize / 1024).toFixed(1);
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
        document.getElementById('dbSize').textContent = 
            totalSize > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;

    } catch(e) {
        console.error('İstatistik güncelleme hatası:', e);
    }
}

// Notları dışa aktarma
async function exportNotes() {
    try {
        // Firestore'dan tüm notları al
        const snapshot = await db.collection('notes').get();
        
        if (snapshot.empty) {
            showNotification('Dışa aktarılacak not bulunamadı!', 'error');
            return;
        }

        // Notları dışa aktarılacak formata dönüştür
        const exportData = snapshot.docs.map(doc => {
            const note = doc.data();
            try {
                // Şifrelenmiş veriyi çöz
                const decryptedData = JSON.parse(decrypt(note.encrypted));
                return {
                    id: doc.id,
                    title: decodeURIComponent(decryptedData.title || ''),
                    text: decodeURIComponent(decryptedData.text || ''),
                    link: decryptedData.link || '',
                    category: note.category,
                    date: note.date
                };
            } catch(e) {
                console.error('Not çözme hatası:', e);
                return null;
            }
        }).filter(note => note !== null);

        // Başarılı not sayısını al
        const successCount = exportData.length;

        // JSON dosyası oluştur
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        // Dosyayı indir
        const a = document.createElement('a');
        a.href = url;
        a.download = `notlar-${new Date().toLocaleDateString('tr-TR')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification(`${successCount} not başarıyla dışa aktarıldı!`, 'success');
    } catch(e) {
        console.error('Dışa aktarma hatası:', e);
        showNotification('Notlar dışa aktarılırken bir hata oluştu!', 'error');
    }
}

// Notları içe aktarma fonksiyonu
async function importNotes() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = async function(event) {
            try {
                const importedNotes = JSON.parse(event.target.result);
                
                // İçe aktarılan notların geçerli olup olmadığını kontrol et
                if (!Array.isArray(importedNotes)) {
                    throw new Error('Geçersiz not formatı');
                }

                showConfirmModal(`${importedNotes.length} not içe aktarılacak. Onaylıyor musunuz?`, async () => {
                    try {
                        // Batch işlemi başlat
                        const batch = db.batch();
                        let successCount = 0;
                        
                        // Her notu Firebase'e ekle
                        for (const note of importedNotes) {
                            const safeTitle = encodeURIComponent(note.title);
                            const safeText = encodeURIComponent(note.text);
                            
                            const noteRef = db.collection('notes').doc();
                            batch.set(noteRef, {
                                title: note.title,
                                text: note.text,
                                link: note.link || '',
                                category: note.category || 'genel',
                                date: note.date || new Date().toISOString(),
                                encrypted: encrypt(JSON.stringify({
                                    title: safeTitle,
                                    text: safeText,
                                    link: note.link || ''
                                })),
                                userId: firebase.auth().currentUser.uid
                            });
                            successCount++;
                        }
                        
                        // Batch işlemini uygula
                        await batch.commit();
                        
                        loadNotes();
                        updateAdminStats();
                        showNotification(`${successCount} not başarıyla içe aktarıldı!`, 'success');
                    } catch(e) {
                        console.error('İçe aktarma hatası:', e);
                        showNotification('Notlar içe aktarılırken bir hata oluştu!', 'error');
                    }
                });
            } catch(e) {
                console.error('Dosya okuma hatası:', e);
                showNotification('Geçersiz dosya formatı!', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Çıkış fonksiyonu
function logout() {
    showConfirmModal('Çıkış yapmak istediğinizden emin misiniz?', async () => {
        try {
            await firebase.auth().signOut();
            
            // Tüm durumları sıfırla
            isAuthenticated = false;
            currentPassword = '';
            isGuestUser = false;
            
            // Formu temizle
            document.getElementById('password').value = '';
            
            // Ekranları değiştir
            document.getElementById('notesSection').style.display = 'none';
            document.getElementById('loginSection').style.display = 'block';
            
            // Admin panel ve not ekleme butonunu görünür yap
            document.getElementById('adminPanel').style.display = 'block';
            document.querySelector('.add-note-btn').style.display = 'flex';
            
            showNotification('Başarıyla çıkış yapıldı!', 'success');
        } catch(e) {
            console.error('Çıkış hatası:', e);
            showNotification('Çıkış yapılırken bir hata oluştu!', 'error');
        }
    });
}

// Her işlemde auth kontrolü
function checkAuth() {
    if (!isAuthenticated) {
        document.getElementById('notesSection').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
        showNotification('Lütfen giriş yapın!', 'error');
        return false;
    }
    return true;
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    // Başlangıçta notlar bölümünü gizle
    document.getElementById('notesSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    
    // Enter ile giriş yapma
    document.getElementById('password').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            login();
        }
    });

    // Ctrl+Enter ile not kaydetme
    document.getElementById('noteInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && event.ctrlKey) {
            event.preventDefault();
            saveNote();
        }
    });

    // Filtreleme
    document.getElementById('filterCategory').addEventListener('change', loadNotes);

    // Giriş denemelerini kontrol et
    const savedAttempts = localStorage.getItem('loginAttempts');
    const savedLastAttempt = localStorage.getItem('lastLoginAttempt');
    
    if (savedAttempts && savedLastAttempt) {
        loginAttempts = parseInt(savedAttempts);
        lastLoginAttempt = parseInt(savedLastAttempt);
        
        // Bekleme süresi dolmuşsa sıfırla
        const currentTime = Date.now();
        if (currentTime - lastLoginAttempt >= LOCKOUT_TIME) {
            loginAttempts = 0;
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('lastLoginAttempt');
        }
    }
});

// Giriş denemelerini localStorage'a kaydet
function updateLoginAttempts() {
    localStorage.setItem('loginAttempts', loginAttempts.toString());
    localStorage.setItem('lastLoginAttempt', lastLoginAttempt.toString());
}

// Not ekleme modalını aç
function showAddNoteModal() {
    document.getElementById('addNoteModal').style.display = 'block';
    document.getElementById('modalNoteTitle').focus();
}

// Not ekleme modalını kapat
function closeAddNoteModal() {
    const modal = document.getElementById('addNoteModal');
    modal.style.display = 'none';
    
    // Form alanlarını temizle
    document.getElementById('modalNoteTitle').value = '';
    document.getElementById('modalNoteLink').value = '';
    document.getElementById('modalNoteInput').value = '';
    document.getElementById('modalNoteCategory').value = 'genel';
    
    // Modal başlığını sıfırla
    modal.querySelector('.modal-header h3').textContent = 'Yeni Not Ekle';
    
    // Kaydet butonunu sıfırla
    const saveButton = modal.querySelector('.primary-btn');
    saveButton.onclick = saveNoteFromModal;
}

// Modaldan not kaydetme
async function saveNoteFromModal() {
    try {
        // Auth kontrolü
        const user = firebase.auth().currentUser;
        if (!user) {
            showNotification('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın!', 'error');
            return;
        }

        const noteTitle = document.getElementById('modalNoteTitle');
        const noteInput = document.getElementById('modalNoteInput');
        const noteLink = document.getElementById('modalNoteLink');
        const category = document.getElementById('modalNoteCategory').value;
        
        if(noteTitle.value.trim() === '') {
            showNotification('Lütfen bir başlık girin!', 'error');
            return;
        }

        if(noteInput.value.trim() === '') {
            showNotification('Lütfen bir not girin!', 'error');
            return;
        }

        // Türkçe karakterleri ve boşlukları güvenli hale getir
        const safeTitle = encodeURIComponent(noteTitle.value.trim());
        const safeText = encodeURIComponent(noteInput.value.trim());
        const safeLink = noteLink.value.trim();

        const noteData = {
            title: noteTitle.value.trim(),
            text: noteInput.value.trim(),
            link: safeLink,
            category: category,
            date: new Date().toISOString(),
            encrypted: encrypt(JSON.stringify({
                title: safeTitle,
                text: safeText,
                link: safeLink
            })),
            userId: user.uid
        };

        // Firebase'e kaydet
        await db.collection('notes').add(noteData);
        
        // Modalı kapat
        closeAddNoteModal();
        
        loadNotes();
        updateAdminStats();
        showNotification('Not başarıyla kaydedildi!', 'success');
    } catch(e) {
        console.error('Not kaydetme hatası:', e);
        showNotification('Not kaydedilirken bir hata oluştu!', 'error');
    }
}

// Modal dışına tıklandığında kapatma
window.onclick = function(event) {
    const addNoteModal = document.getElementById('addNoteModal');
    const confirmModal = document.getElementById('confirmModal');
    
    if (event.target === addNoteModal) {
        closeAddNoteModal();
    }
    if (event.target === confirmModal) {
        confirmDelete(false);
    }
}

// Kategori filtreleme fonksiyonu
async function filterNotes() {
    const notesList = document.getElementById('notesList');
    const filterCategory = document.getElementById('filterCategory').value;
    notesList.innerHTML = '';
    
    try {
        // Auth kontrolü
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('Kullanıcı oturumu bulunamadı');
            return;
        }

        // Notları sorgula
        const snapshot = await db.collection('notes')
            .orderBy('date', 'desc')
            .get();

        if (snapshot.empty) {
            notesList.innerHTML = '<div class="no-notes">Henüz not eklenmemiş</div>';
            return;
        }

        let hasVisibleNotes = false;

        snapshot.forEach(doc => {
            try {
                const note = doc.data();
                
                // Kategori filtreleme
                if (filterCategory !== 'hepsi' && note.category !== filterCategory) {
                    return;
                }

                hasVisibleNotes = true;
                const decryptedData = JSON.parse(decrypt(note.encrypted));
                
                // Türkçe karakterleri geri çevir
                const title = decodeURIComponent(decryptedData.title || '');
                const text = decodeURIComponent(decryptedData.text || '');
                
                const noteDiv = document.createElement('div');
                noteDiv.className = `note ${note.category}`;
                
                noteDiv.innerHTML = `
                    <div class="note-header">
                        <div class="note-header-left">
                            <h4 class="note-title">${title}</h4>
                            <span class="note-category ${note.category}">${getCategoryName(note.category)}</span>
                        </div>
                        <div class="note-date">${formatDate(note.date)}</div>
                    </div>
                    <div class="note-content">${text}</div>
                    ${decryptedData.link ? `
                        <div class="note-link">
                            <a href="${decryptedData.link}" target="_blank" rel="noopener noreferrer">
                                <span>🔗</span>
                                <span>Bağlantıya Git</span>
                            </a>
                        </div>
                    ` : ''}
                    <div class="note-actions">
                        <button class="edit-btn" onclick="editNote('${doc.id}')">
                            <span>✏️</span>
                            <span>Düzenle</span>
                        </button>
                        <button class="delete-btn" onclick="deleteNote('${doc.id}')">
                            <span>🗑️</span>
                        </button>
                    </div>
                `;

                notesList.appendChild(noteDiv);
            } catch(e) {
                console.error('Not işleme hatası:', e);
            }
        });

        // Filtrelenmiş sonuçlarda not yoksa mesaj göster
        if (!hasVisibleNotes) {
            if (filterCategory !== 'hepsi') {
                notesList.innerHTML = '<div class="no-notes">Bu kategoride not bulunamadı</div>';
            } else {
                notesList.innerHTML = '<div class="no-notes">Henüz not eklenmemiş</div>';
            }
        }
        
        updateAdminStats();
    } catch(e) {
        console.error('Notları filtreleme hatası:', e);
        showNotification('Notlar filtrelenirken bir hata oluştu!', 'error');
    }
}

// Not düzenleme fonksiyonu
async function editNote(noteId) {
    try {
        const doc = await db.collection('notes').doc(noteId).get();
        if (!doc.exists) {
            showNotification('Not bulunamadı!', 'error');
            return;
        }

        const note = doc.data();
        const decryptedData = JSON.parse(decrypt(note.encrypted));
        
        // Modal içeriğini doldur
        document.getElementById('modalNoteTitle').value = decodeURIComponent(decryptedData.title || '');
        document.getElementById('modalNoteInput').value = decodeURIComponent(decryptedData.text || '');
        document.getElementById('modalNoteLink').value = decryptedData.link || '';
        document.getElementById('modalNoteCategory').value = note.category;
        
        // Modalı göster
        const modal = document.getElementById('addNoteModal');
        modal.style.display = 'block';
        
        // Kaydet butonunu güncelle
        const saveButton = modal.querySelector('.primary-btn');
        saveButton.onclick = () => updateNote(noteId);
        
        // Modal başlığını güncelle
        modal.querySelector('.modal-header h3').textContent = 'Notu Düzenle';
        
    } catch(e) {
        console.error('Not düzenleme hatası:', e);
        showNotification('Not düzenlenirken bir hata oluştu!', 'error');
    }
}

// Not güncelleme fonksiyonu
async function updateNote(noteId) {
    try {
        const noteTitle = document.getElementById('modalNoteTitle');
        const noteInput = document.getElementById('modalNoteInput');
        const noteLink = document.getElementById('modalNoteLink');
        const category = document.getElementById('modalNoteCategory').value;
        
        if(noteTitle.value.trim() === '') {
            showNotification('Lütfen bir başlık girin!', 'error');
            return;
        }

        if(noteInput.value.trim() === '') {
            showNotification('Lütfen bir not girin!', 'error');
            return;
        }

        // Türkçe karakterleri ve boşlukları güvenli hale getir
        const safeTitle = encodeURIComponent(noteTitle.value.trim());
        const safeText = encodeURIComponent(noteInput.value.trim());
        const safeLink = noteLink.value.trim();

        const noteData = {
            title: noteTitle.value.trim(),
            text: noteInput.value.trim(),
            link: safeLink,
            category: category,
            date: new Date().toISOString(),
            encrypted: encrypt(JSON.stringify({
                title: safeTitle,
                text: safeText,
                link: safeLink
            }))
        };

        // Firebase'de güncelle
        await db.collection('notes').doc(noteId).update(noteData);
        
        // Modalı kapat
        closeAddNoteModal();
        
        // Notları yeniden yükle
        loadNotes();
        updateAdminStats();
        showNotification('Not başarıyla güncellendi!', 'success');
    } catch(e) {
        console.error('Not güncelleme hatası:', e);
        showNotification('Not güncellenirken bir hata oluştu!', 'error');
    }
} 
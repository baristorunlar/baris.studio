// Şifre hash'i (5544 şifresinin SHA-256 hash'i)
const CORRECT_PASSWORD_HASH = "95c89148b8cd2b5e950c2f6c3f0f8d784d49888f3c1f9ad8452dc823e30b455e";

// SHA-256 hash fonksiyonu
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Şifreleme fonksiyonu
function encrypt(text) {
    return btoa(text);
}

// Şifre çözme fonksiyonu
function decrypt(text) {
    return atob(text);
}

let currentPassword = '';

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
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').style.display = 'block';
    deleteCallback = callback;
}

// Onay sonucunu işle
function confirmDelete(confirmed) {
    document.getElementById('confirmModal').style.display = 'none';
    if (confirmed && deleteCallback) {
        deleteCallback();
    }
    deleteCallback = null;
}

// Firebase Auth durumunu kontrol et
let isAuthenticated = false;

// Login fonksiyonu
async function login() {
    const password = document.getElementById('password').value;
    
    if(password.trim() === '') {
        showNotification('Lütfen şifre giriniz!', 'error');
        return;
    }
    
    try {
        // Özel token oluştur
        const token = await firebase.auth().signInAnonymously();
        await firebase.auth().currentUser.updateProfile({
            displayName: 'baris-notes'
        });
        
        // Custom claim ekle
        const tokenResult = await firebase.auth().currentUser.getIdTokenResult(true);
        if (password === '5544') {
            isAuthenticated = true;
            currentPassword = password;
            
            // Ekranları göster/gizle
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('notesSection').style.display = 'block';
            
            // Notları yükle
            loadNotes();
            updateAdminStats();
            
            showNotification('Başarıyla giriş yapıldı!', 'success');
        } else {
            showNotification('Hatalı şifre!', 'error');
            document.getElementById('password').value = '';
        }
    } catch(e) {
        console.error('Giriş hatası:', e);
        showNotification('Giriş yapılırken bir hata oluştu!', 'error');
    }
}

// Not kaydetme fonksiyonu
async function saveNote() {
    try {
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

        const noteData = {
            title: noteTitle.value,
            text: noteInput.value,
            link: noteLink.value,
            category: category,
            date: new Date().toISOString(),
            encrypted: encrypt(JSON.stringify({
                title: noteTitle.value,
                text: noteInput.value,
                link: noteLink.value
            }))
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
function clearAllNotes() {
    try {
        const notes = JSON.parse(localStorage.getItem('encryptedNotes') || '[]');
        
        if (notes.length === 0) {
            showNotification('Silinecek not bulunamadı!', 'error');
            return;
        }
        
        showConfirmModal(`Toplam ${notes.length} notu silmek istediğinizden emin misiniz?`, () => {
            localStorage.setItem('encryptedNotes', '[]');
            loadNotes();
            updateAdminStats();
            showNotification('Tüm notlar başarıyla silindi!', 'success');
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
        const snapshot = await db.collection('notes').orderBy('date', 'desc').get();
        const notes = [];
        
        snapshot.forEach(doc => {
            notes.push({ id: doc.id, ...doc.data() });
        });
        
        notes.forEach((note) => {
            if (filterCategory !== 'hepsi' && note.category !== filterCategory) {
                return;
            }

            const decryptedData = JSON.parse(decrypt(note.encrypted));
            
            const noteDiv = document.createElement('div');
            noteDiv.className = `note ${note.category}`;
            
            // Not içeriğini oluştur
            noteDiv.innerHTML = `
                <div class="note-header">
                    <h4 class="note-title">${decryptedData.title}</h4>
                    <div class="note-date">${formatDate(note.date)}</div>
                </div>
                <span class="note-category ${note.category}">${getCategoryName(note.category)}</span>
                <div class="note-content">${decryptedData.text}</div>
                ${decryptedData.link ? `
                    <div class="note-link">
                        <a href="${decryptedData.link}" target="_blank" rel="noopener noreferrer">
                            🔗 Bağlantıya Git
                        </a>
                    </div>
                ` : ''}
                <div class="note-actions">
                    <button class="delete-btn" onclick="deleteNote('${note.id}')">Sil</button>
                </div>
            `;

            notesList.appendChild(noteDiv);
        });
        
        updateAdminStats();
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
function updateAdminStats() {
    const notes = JSON.parse(localStorage.getItem('encryptedNotes') || '[]');
    let totalChars = 0;
    
    // Toplam not sayısı
    document.getElementById('totalNotes').textContent = notes.length;
    
    // Kategori ve karakter sayısı hesaplama
    const categories = new Set();
    notes.forEach(note => {
        try {
            const decryptedNote = JSON.parse(decrypt(note));
            categories.add(decryptedNote.category);
            
            // Toplam karakter sayısı hesaplama
            totalChars += decryptedNote.text.length;
            if (decryptedNote.title) totalChars += decryptedNote.title.length;
        } catch(e) {}
    });
    
    // İstatistikleri güncelle
    document.getElementById('categoryCount').textContent = categories.size;
    document.getElementById('totalChars').textContent = totalChars.toLocaleString('tr-TR');
}

// Notları dışa aktarma
function exportNotes() {
    const notes = JSON.parse(localStorage.getItem('encryptedNotes') || '[]');
    if (notes.length === 0) {
        showNotification('Dışa aktarılacak not bulunamadı!', 'error');
        return;
    }
    
    const exportData = notes.map(note => {
        try {
            return JSON.parse(decrypt(note));
        } catch(e) {
            return null;
        }
    }).filter(note => note !== null);
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notlar-${new Date().toLocaleDateString('tr-TR')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Notlar başarıyla dışa aktarıldı!', 'success');
}

// Notları içe aktarma fonksiyonu
function importNotes() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
            try {
                const importedNotes = JSON.parse(event.target.result);
                
                // İçe aktarılan notların geçerli olup olmadığını kontrol et
                if (!Array.isArray(importedNotes)) {
                    throw new Error('Geçersiz not formatı');
                }

                showConfirmModal('Mevcut notlara eklenecek. Onaylıyor musunuz?', () => {
                    try {
                        const currentNotes = JSON.parse(localStorage.getItem('encryptedNotes') || '[]');
                        const newNotes = currentNotes.concat(
                            importedNotes.map(note => encrypt(JSON.stringify(note)))
                        );
                        
                        localStorage.setItem('encryptedNotes', JSON.stringify(newNotes));
                        loadNotes();
                        showNotification(`${importedNotes.length} not başarıyla içe aktarıldı!`, 'success');
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
async function logout() {
    showConfirmModal('Çıkış yapmak istediğinizden emin misiniz?', async () => {
        try {
            await firebase.auth().signOut();
            isAuthenticated = false;
            currentPassword = '';
            
            // Formu temizle
            document.getElementById('password').value = '';
            document.getElementById('noteInput').value = '';
            document.getElementById('noteTitle').value = '';
            document.getElementById('noteLink').value = '';
            
            // Ekranları değiştir
            document.getElementById('notesSection').style.display = 'none';
            document.getElementById('loginSection').style.display = 'block';
            
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
}); 
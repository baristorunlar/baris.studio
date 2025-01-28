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

// Login fonksiyonu
function login() {
    const password = document.getElementById('password').value;
    
    if(password.trim() === '') {
        showNotification('Lütfen şifre giriniz!', 'error');
        return;
    }
    
    if(password !== '5544') {
        showNotification('Hatalı şifre!', 'error');
        document.getElementById('password').value = '';
        return;
    }
    
    try {
        // Giriş başarılı
        currentPassword = password;
        
        // Ekranları göster/gizle
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('notesSection').style.display = 'block';
        
        // Notları yükle
        loadNotes();
        updateAdminStats();
        
        // Başarılı bildirimlerini göster
        showNotification('Başarıyla giriş yapıldı!', 'success');
        setTimeout(() => {
            showNotification('İpucu: Not kaydetmek için Ctrl + Enter kullanabilirsiniz', 'success');
        }, 3000);
    } catch(e) {
        console.error('Giriş hatası:', e);
        showNotification('Giriş yapılırken bir hata oluştu!', 'error');
    }
}

// Not kaydetme fonksiyonu
function saveNote() {
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
            date: new Date().toISOString()
        };

        const notes = JSON.parse(localStorage.getItem('encryptedNotes') || '[]');
        notes.push(encrypt(JSON.stringify(noteData)));
        localStorage.setItem('encryptedNotes', JSON.stringify(notes));
        
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
function deleteNote(index) {
    try {
        const notes = JSON.parse(localStorage.getItem('encryptedNotes') || '[]');
        const decryptedNote = JSON.parse(decrypt(notes[index]));
        const notePreview = decryptedNote.text.slice(0, 30) + (decryptedNote.text.length > 30 ? '...' : '');
        
        showConfirmModal(`"${notePreview}" notunu silmek istediğinizden emin misiniz?`, () => {
            notes.splice(index, 1);
            localStorage.setItem('encryptedNotes', JSON.stringify(notes));
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
function loadNotes() {
    const notesList = document.getElementById('notesList');
    const filterCategory = document.getElementById('filterCategory').value;
    notesList.innerHTML = '';
    
    const notes = JSON.parse(localStorage.getItem('encryptedNotes') || '[]');
    
    notes.forEach((encryptedNote, index) => {
        try {
            const decryptedNote = JSON.parse(decrypt(encryptedNote));
            
            if (filterCategory !== 'hepsi' && decryptedNote.category !== filterCategory) {
                return;
            }

            const noteDiv = document.createElement('div');
            noteDiv.className = `note ${decryptedNote.category}`;
            
            // Not içeriğini oluştur
            let noteContent = `
                <div class="note-header">
                    <h4 class="note-title">${decryptedNote.title}</h4>
                    <div class="note-date">${formatDate(decryptedNote.date)}</div>
                </div>
                <span class="note-category ${decryptedNote.category}">${getCategoryName(decryptedNote.category)}</span>
                <div class="note-content">${decryptedNote.text}</div>
            `;

            // Eğer link varsa ekle
            if (decryptedNote.link && decryptedNote.link.trim() !== '') {
                noteContent += `
                    <div class="note-link">
                        <a href="${decryptedNote.link}" target="_blank" rel="noopener noreferrer">
                            🔗 Bağlantıya Git
                        </a>
                    </div>
                `;
            }

            noteContent += `
                <div class="note-actions">
                    <button class="delete-btn" onclick="deleteNote(${index})">Sil</button>
                </div>
            `;

            noteDiv.innerHTML = noteContent;
            notesList.appendChild(noteDiv);
        } catch(e) {
            console.error('Not çözülemedi:', e);
        }
    });
    
    updateAdminStats();
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

// Çıkış yapma fonksiyonu
function logout() {
    showConfirmModal('Çıkış yapmak istediğinizden emin misiniz?', () => {
        // Şifreyi temizle
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
    });
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
// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyDNSunWZNRwn27g1306IakswU00DHlQorM",
    authDomain: "baristudio.firebaseapp.com",
    projectId: "baristudio",
    storageBucket: "baristudio.firebasestorage.app",
    messagingSenderId: "263225681077",
    appId: "1:263225681077:web:e492096c17e36c6b684afc"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); 
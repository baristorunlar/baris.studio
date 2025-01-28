// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyDNSunWZNRwn27g1306IakswU00DHlQorM",
    authDomain: "baristudio.firebaseapp.com",
    projectId: "baristudio",
    storageBucket: "baristudio.appspot.com",
    messagingSenderId: "263225681077",
    appId: "1:263225681077:web:e492096c17e36c6b684afc",
    databaseURL: "https://baristudio-default-rtdb.firebaseio.com"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Firebase Auth'u başlat
const auth = firebase.auth();

// Anonim girişi etkinleştir
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); 
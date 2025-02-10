// Firebase yapılandırması (Güvenli)
const firebaseConfig = {
    apiKey: atob("QUl6YVN5RE5TdW5XWk5Sd24yN2cxMzA2SWFrc3dVMDBESGxRb3JN"),
    authDomain: atob("YmFyaXN0dWRpby5maXJlYmFzZWFwcC5jb20="),
    projectId: atob("YmFyaXN0dWRpbw=="),
    storageBucket: atob("YmFyaXN0dWRpby5hcHBzcG90LmNvbQ=="),
    messagingSenderId: atob("MjYzMjI1NjgxMDc3"),
    appId: atob("MToyNjMyMjU2ODEwNzc6d2ViOmU0OTIwOTZjMTdlMzZjNmI2ODRhZmM="),
    databaseURL: atob("aHR0cHM6Ly9iYXJpc3R1ZGlvLWRlZmF1bHQtcnRkYi5maXJlYmFzZWlvLmNvbQ==")
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Firebase Auth'u başlat
const auth = firebase.auth();

// Anonim girişi etkinleştir
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); 
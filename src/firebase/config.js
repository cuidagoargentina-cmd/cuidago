import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCLq0tqrQIk2gyTzwvTm5PjagUnsInf67M",
  authDomain: "cuida-go.firebaseapp.com",
  projectId: "cuida-go",
  storageBucket: "cuida-go.firebasestorage.app",
  messagingSenderId: "375139093568",
  appId: "1:375139093568:web:d78abb7e1ba9f0a74123a5",
  measurementId: "G-KWETH246FF"
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const storage  = getStorage(app);

// Messaging solo funciona en browsers que lo soportan (no en Safari antiguo)
let messaging = null;
isSupported().then(soportado => {
  if (soportado) messaging = getMessaging(app);
});

export { app, auth, db, storage, messaging };
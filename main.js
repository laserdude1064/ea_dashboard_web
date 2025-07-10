console.log("📡 main.js geladen");
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC1cqUCWwACeFYFFZ7MyIOweamKZ8PnNKU",
  authDomain: "ea-dashboard-636cf.firebaseapp.com",
  databaseURL: "https://ea-dashboard-636cf-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ea-dashboard-636cf",
  storageBucket: "ea-dashboard-636cf.firebasestorage.app",
  messagingSenderId: "602990579998",
  appId: "1:602990579998:web:c6775bcae19a8afba5b90f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔍 Beispiel: Alle Dokumente aus 'ea_monitoring' lesen
async function fetchData() {
  const snapshot = await getDocs(collection(db, "ea_monitoring"));
  snapshot.forEach((doc) => {
    console.log("📦 Eintrag:", doc.data());
  });
}

fetchData();

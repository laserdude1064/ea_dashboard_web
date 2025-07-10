console.log("📡 main.js geladen");

// Modulpfade direkt von Firebase CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔑 Deine Firebase Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyC1cqUCWwACeFYFFZ7MyIOweamKZ8PnNKU",
  authDomain: "ea-dashboard-636cf.firebaseapp.com",
  projectId: "ea-dashboard-636cf",
  storageBucket: "ea-dashboard-636cf.appspot.com",
  messagingSenderId: "602990579998",
  appId: "1:602990579998:web:c6775bcae19a8afba5b90f"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Daten abrufen und anzeigen
async function fetchData() {
  try {
    const snapshot = await getDocs(collection(db, "ea_monitoring"));
    let html = "<ul>";
    snapshot.forEach(doc => {
      const data = doc.data();
      html += `<li>${data.timestamp}: ${data.symbol} – Equity: ${data.equity}</li>`;
    });
    html += "</ul>";
    document.getElementById("output").innerHTML = html;
  } catch (err) {
    console.error("❌ Fehler beim Datenabruf:", err);
    document.getElementById("output").innerText = "❌ Fehler beim Datenabruf.";
  }
}

fetchData();

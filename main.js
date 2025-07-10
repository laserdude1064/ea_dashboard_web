import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.min.mjs"; // <-- ES-Modul Version

console.log("📡 main.js geladen");

const firebaseConfig = {
  apiKey: "AIzaSyC1cqUCWwACeFYFFZ7MyIOweamKZ8PnNKU",
  authDomain: "ea-dashboard-636cf.firebaseapp.com",
  projectId: "ea-dashboard-636cf",
  storageBucket: "ea-dashboard-636cf.appspot.com",
  messagingSenderId: "602990579998",
  appId: "1:602990579998:web:c6775bcae19a8afba5b90f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchData() {
  console.log("🔍 Lade Daten aus 'ea_monitoring'...");
  const snapshot = await getDocs(collection(db, "ea_monitoring"));
  const timestamps = [];
  const equity = [];

  snapshot.forEach((doc) => {
    const d = doc.data();
    if (d.timestamp && d.equity) {
      timestamps.push(d.timestamp);
      equity.push(d.equity);
      console.log("📦 Eintrag: ", d);
    }
  });

  const ctx = document.getElementById("chart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: timestamps,
      datasets: [{
        label: "Equity",
        data: equity,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
        fill: false
      }]
    }
  });
}

fetchData();

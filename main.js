import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
  const dataList = [];

  snapshot.forEach((doc) => {
    const d = doc.data();
    if (d.timestamp && d.equity && d.balance) {
      dataList.push({
        timestamp: d.timestamp,
        equity: d.equity,
        balance: d.balance
      });
    }
  });

  // Sortiere nach Timestamp
  dataList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const timestamps = dataList.map(d => d.timestamp);
  const equity = dataList.map(d => d.equity);
  const balance = dataList.map(d => d.balance);

  const ctx = document.getElementById("chart").getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: timestamps,
      datasets: [
        {
          label: "Equity",
          data: equity,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
          fill: false
        },
        {
          label: "Balance",
          data: balance,
          borderColor: "rgb(192, 75, 192)",
          tension: 0.1,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Equity & Balance Verlauf'
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Kontostand'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Zeit'
          }
        }
      }
    }
  });
}

fetchData();

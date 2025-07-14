import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

console.log("📡 main.js geladen");

document.addEventListener("DOMContentLoaded", () => {
  // Firebase Setup
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
  const auth = getAuth(app);

  // UI Elemente
  const loginForm = document.getElementById("login-form");
  const loginSection = document.getElementById("login-section");
  const contentSection = document.getElementById("content-section");
  const logoutButton = document.getElementById("logout-button");

  const statsMonitoringBody = document.querySelector("#stats-monitoring tbody");
  const statsTradesBody = document.querySelector("#stats-trades tbody");

  // Tab-Umschaltung
  function showTab(tabNumber) {
    const tabs = document.querySelectorAll(".tab-content");
    const buttons = [tab1Btn, tab2Btn];
  
    tabs.forEach((tab, index) => {
      if (index === tabNumber - 1) {
        tab.style.display = "block";
        tab.classList.add("active");
        buttons[index].classList.add("active");
      } else {
        tab.style.display = "none";
        tab.classList.remove("active");
        buttons[index].classList.remove("active");
      }
    });
  }

tab1Btn.addEventListener("click", () => showTab(1));
tab2Btn.addEventListener("click", () => showTab(2));

  // Login / Logout
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginForm.email.value;
      const password = loginForm.password.value;
      try {
        await signInWithEmailAndPassword(auth, email, password);
        loginForm.reset();
      } catch (error) {
        alert("Login fehlgeschlagen: " + error.message);
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      signOut(auth);
    });
  }

  // Auth State beobachten
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginSection.style.display = "none";
      contentSection.style.display = "block";
      showTab(1);
      fetchData();
      fetchTradeHistory();
    } else {
      loginSection.style.display = "block";
      contentSection.style.display = "none";
    }
  });

  // Login Funktion für HTML-Zugriff (wird derzeit nicht genutzt)
  window.login = async function () {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      document.getElementById("login-error").textContent = "❌ Login fehlgeschlagen: " + error.message;
    }
  };
  // ============ Monitoring-Daten laden ============
  async function fetchData() {
    console.log("🔍 Lade Daten aus 'ea_monitoring'...");
    const snapshot = await getDocs(collection(db, "ea_monitoring"));
    const dataList = [];

    snapshot.forEach((doc) => {
      const d = doc.data();
      if (d.timestamp && d.equity && d.balance && d.drawdown !== undefined) {
        dataList.push(d);
      }
    });

    dataList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const labels = dataList.map(d => d.timestamp);
    const equity = dataList.map(d => d.equity);
    const balance = dataList.map(d => d.balance);
    const drawdown = dataList.map(d => d.drawdown);

    const ctx = document.getElementById("chart").getContext("2d");

    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            type: "line",
            label: "Equity",
            data: equity,
            borderColor: "rgb(75, 192, 192)",
            tension: 0.1,
            yAxisID: "y"
          },
          {
            type: "line",
            label: "Balance",
            data: balance,
            borderColor: "rgb(192, 75, 192)",
            tension: 0.1,
            yAxisID: "y"
          },
          {
            type: "bar",
            label: "Drawdown (%)",
            data: drawdown,
            backgroundColor: "rgba(255, 99, 132, 0.5)",
            borderColor: "rgb(255, 99, 132)",
            yAxisID: "y1"
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Equity, Balance & Drawdown"
          },
          legend: {
            position: "top"
          }
        },
        scales: {
          y: {
            type: "linear",
            position: "left",
            title: { display: true, text: "Kontostand" }
          },
          y1: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            title: { display: true, text: "Drawdown (%)" }
          },
          x: {
            title: { display: true, text: "Zeit" }
          }
        }
      }
    });

    updateMonitoringStats(equity, balance, drawdown);
  }

  function updateMonitoringStats(equity, balance, drawdown) {
    const lastEquity = equity.at(-1) || 0;
    const firstEquity = equity[0] || 0;
    const lastBalance = balance.at(-1) || 0;
    const firstBalance = balance[0] || 0;
    const profit = lastEquity - firstEquity;
    const growth = ((lastBalance - firstBalance) / firstBalance) * 100;
    const maxDD = Math.max(...drawdown);
    const maxDDAbs = (maxDD / 100) * lastEquity;
    const recovery = maxDDAbs > 0 ? profit / maxDDAbs : "–";
    const returns = equity.slice(1).map((e, i) => e - equity[i]);
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.map(r => (r - avg) ** 2).reduce((a, b) => a + b, 0) / returns.length);
    const sharpe = stdDev > 0 ? avg / stdDev : "–";
    const gains = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
    const losses = returns.filter(r => r < 0).reduce((a, b) => a + b, 0);
    const profitFactor = losses < 0 ? gains / Math.abs(losses) : "–";

    const stats = [
      ["Aktuelle Balance", `${lastBalance.toFixed(2)} €`],
      ["Balance-Wachstum", `${growth.toFixed(2)} %`],
      ["Aktueller Equity", `${lastEquity.toFixed(2)} €`],
      ["Gewinn seit Start", `${profit.toFixed(2)} €`],
      ["Maximaler Drawdown (%)", `${maxDD.toFixed(2)} %`],
      ["Maximaler Drawdown (absolut)", `${maxDDAbs.toFixed(2)} €`],
      ["Recovery Factor", typeof recovery === "number" ? recovery.toFixed(2) : recovery],
      ["Sharpe Ratio", typeof sharpe === "number" ? sharpe.toFixed(2) : sharpe],
      ["Profit Factor", typeof profitFactor === "number" ? profitFactor.toFixed(2) : profitFactor]
    ];

    statsMonitoringBody.innerHTML = "";
    for (const [label, value] of stats) {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${label}</td><td style="text-align:right">${value}</td>`;
      statsMonitoringBody.appendChild(row);
    }
  }

  // ============ Trade-Daten laden ============
  async function fetchTradeHistory() {
    console.log("📦 Lade Daten aus 'ea_trades'...");
    const snapshot = await getDocs(collection(db, "ea_trades"));
    const tradeList = [];

    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.time && typeof d.profit === "number") {
        tradeList.push(d);
      }
    });

    if (tradeList.length === 0) return;

    const defaultStart = new Date("2025-01-01T00:00:00Z");
    const defaultEnd = new Date();

    const rangeInput = document.getElementById("dateRange");
    let selectedRange = [defaultStart, defaultEnd];

    flatpickr(rangeInput, {
      mode: "range",
      dateFormat: "Y-m-d",
      defaultDate: selectedRange,
      locale: "de",
      onChange: (dates) => {
        if (dates.length === 2) {
          renderChartForRange(dates[0], dates[1]);
        }
      }
    });

    let tradeChart = null;

    function renderChartForRange(startDate, endDate) {
      const filtered = tradeList
        .filter(t => new Date(t.time) >= startDate && new Date(t.time) <= endDate)
        .sort((a, b) => a.time.localeCompare(b.time));

      const timestamps = [];
      const balances = [];
      let cum = 0;

      filtered.forEach(t => {
        cum += t.profit;
        timestamps.push(t.time);
        balances.push(cum);
      });

      const ctx = document.getElementById("chart-trades").getContext("2d");
      if (tradeChart) tradeChart.destroy();

      tradeChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: timestamps,
          datasets: [{
            label: "Kumulierte Balance (Zeitraum)",
            data: balances,
            borderColor: "rgb(54, 162, 235)",
            fill: false,
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: `Trades vom ${startDate.toISOString().split("T")[0]} bis ${endDate.toISOString().split("T")[0]}`
            }
          }
        }
      });

      updateTradeStats(filtered);
    }

    renderChartForRange(defaultStart, defaultEnd);
  }

  function updateTradeStats(trades) {
    if (trades.length === 0) {
      statsTradesBody.innerHTML = "<tr><td colspan='2' style='text-align:center'>Keine Trades im gewählten Zeitraum</td></tr>";
      return;
    }

    const profits = trades.map(t => t.profit);
    const total = profits.reduce((a, b) => a + b, 0);
    const avg = total / profits.length;
    const max = Math.max(...profits);
    const min = Math.min(...profits);
    const wins = profits.filter(p => p > 0).length;
    const losses = profits.filter(p => p <= 0).length;

    let peak = 0, dd = 0, maxDD = 0, running = 0;
    for (let p of profits) {
      running += p;
      if (running > peak) peak = running;
      dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    }

    const recovery = maxDD > 0 ? total / maxDD : "–";
    const stdDev = Math.sqrt(profits.map(p => (p - avg) ** 2).reduce((a, b) => a + b, 0) / profits.length);
    const sharpe = stdDev > 0 ? avg / stdDev : "–";
    const gain = profits.filter(p => p > 0).reduce((a, b) => a + b, 0);
    const loss = profits.filter(p => p < 0).reduce((a, b) => a + b, 0);
    const pf = loss < 0 ? gain / Math.abs(loss) : "–";

    const stats = [
      ["Anzahl Trades", trades.length],
      ["Gesamter Gewinn", total.toFixed(2) + " €"],
      ["Durchschnittlicher Gewinn", avg.toFixed(2) + " €"],
      ["Maximaler Gewinn", max.toFixed(2) + " €"],
      ["Maximaler Verlust", min.toFixed(2) + " €"],
      ["Gewonnene Trades", wins],
      ["Verlorene Trades", losses],
      ["Recovery Factor", typeof recovery === "number" ? recovery.toFixed(2) : recovery],
      ["Sharpe Ratio", typeof sharpe === "number" ? sharpe.toFixed(2) : sharpe],
      ["Profit Factor", typeof pf === "number" ? pf.toFixed(2) : pf]
    ];

    statsTradesBody.innerHTML = "";
    for (const [label, value] of stats) {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${label}</td><td style="text-align:right">${value}</td>`;
      statsTradesBody.appendChild(row);
    }
  }
});

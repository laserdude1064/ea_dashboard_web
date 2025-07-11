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

const statsMonitoringBody = document.querySelector("#stats-monitoring tbody");
const statsTradesBody = document.querySelector("#stats-trades tbody");

async function fetchData() {
  console.log("🔍 Lade Daten aus 'ea_monitoring'...");

  const snapshot = await getDocs(collection(db, "ea_monitoring"));
  const dataList = [];

  snapshot.forEach((doc) => {
    const d = doc.data();
    if (d.timestamp && d.equity && d.balance && d.drawdown !== undefined) {
      dataList.push({
        timestamp: d.timestamp,
        equity: d.equity,
        balance: d.balance,
        drawdown: d.drawdown
      });
    }
  });

  // Sortieren nach Timestamp
  dataList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const timestamps = dataList.map(d => d.timestamp);
  const equity = dataList.map(d => d.equity);
  const balance = dataList.map(d => d.balance);
  const drawdown = dataList.map(d => d.drawdown);

  const ctx = document.getElementById("chart").getContext("2d");

  new Chart(ctx, {
    type: "bar", // Basis-Typ: bar, für Mischdiagramme
    data: {
      labels: timestamps,
      datasets: [
        {
          type: "line",
          label: "Equity",
          data: equity,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
          yAxisID: "y",
          fill: false
        },
        {
          type: "line",
          label: "Balance",
          data: balance,
          borderColor: "rgb(192, 75, 192)",
          tension: 0.1,
          yAxisID: "y",
          fill: false
        },
        {
          type: "bar",
          label: "Drawdown (%)",
          data: drawdown,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgb(255, 99, 132)",
          borderWidth: 1,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        title: {
          display: true,
          text: 'Equity, Balance & Drawdown'
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Kontostand'
          }
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: {
            drawOnChartArea: false
          },
          title: {
            display: true,
            text: 'Drawdown (%)'
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

  updateMonitoringStats(equity, balance, drawdown);
}

function updateMonitoringStats(equity, balance, drawdown) {
  const firstEquity = equity[0] || 0;
  const lastEquity = equity[equity.length - 1] || 0;
  const firstBalance = balance[0] || 0;
  const lastBalance = balance[balance.length - 1] || 0;

  const profit = lastEquity - firstEquity;
  const balanceGrowth = ((lastBalance - firstBalance) / firstBalance) * 100;
  const maxDrawdown = Math.max(...drawdown);
  const maxDrawdownAbs = (maxDrawdown / 100) * lastEquity;
  const recoveryFactor = maxDrawdownAbs > 0 ? profit / maxDrawdownAbs : "–";

  const returns = equity.slice(1).map((e, i) => e - equity[i]);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.map(r => (r - avgReturn) ** 2).reduce((a, b) => a + b, 0) / returns.length
  );
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : "–";

  const gains = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
  const losses = returns.filter(r => r < 0).reduce((a, b) => a + b, 0);
  const profitFactor = losses < 0 ? gains / Math.abs(losses) : "–";

  const stats = [
    ["Aktuelle Balance", `${lastBalance.toFixed(2)} €`],
    ["Balance-Wachstum", `${balanceGrowth.toFixed(2)} %`],
    ["Aktueller Equity", `${lastEquity.toFixed(2)} €`],
    ["Gewinn seit Start", `${profit.toFixed(2)} €`],
    ["Maximaler Drawdown (%)", `${maxDrawdown.toFixed(2)} %`],
    ["Maximaler Drawdown (absolut)", `${maxDrawdownAbs.toFixed(2)} €`],
    ["Recovery Factor", typeof recoveryFactor === "number" ? recoveryFactor.toFixed(2) : recoveryFactor],
    ["Sharpe Ratio", typeof sharpeRatio === "number" ? sharpeRatio.toFixed(2) : sharpeRatio],
    ["Profit Factor", typeof profitFactor === "number" ? profitFactor.toFixed(2) : profitFactor]
  ];

  statsMonitoringBody.innerHTML = "";
  for (const [label, value] of stats) {
    const row = document.createElement("tr");
    const cell1 = document.createElement("td");
    const cell2 = document.createElement("td");
    cell1.textContent = label;
    cell2.textContent = value;
    cell2.style.textAlign = "right";
    row.appendChild(cell1);
    row.appendChild(cell2);
    statsMonitoringBody.appendChild(row);
  }
}

async function fetchTradeHistory() {
  console.log("📦 Lade Daten aus 'ea_trades'...");

  const snapshot = await getDocs(collection(db, "ea_trades"));
  const tradeList = [];

  snapshot.forEach((doc) => {
    const d = doc.data();
    if (d.time && typeof d.profit === "number") {
      tradeList.push({
        time: d.time,
        profit: d.profit
      });
    }
  });

  if (tradeList.length === 0) return;

  const parseDate = (str) => new Date(str);

  const defaultStart = new Date("2025-01-01T00:00:00Z");
  const defaultEnd = new Date();

  const rangeInput = document.getElementById("dateRange");
  let selectedRange = [defaultStart, defaultEnd];

  flatpickr(rangeInput, {
    mode: "range",
    dateFormat: "Y-m-d",
    defaultDate: selectedRange,
    onChange: function (selectedDates) {
      if (selectedDates.length === 2) {
        selectedRange = selectedDates;
        renderChartForRange(selectedRange[0], selectedRange[1]);
      }
    },
    locale: "de",
    altInput: true,
    altFormat: "d.m.Y",
    static: true,
    shorthandCurrentMonth: true,
    disableMobile: true,
    onReady: function (selectedDates, dateStr, instance) {
      const presets = [
        {
          label: "📅 Laufendes Jahr",
          range: [
            new Date(new Date().getFullYear(), 0, 1),
            new Date()
          ]
        },
        {
          label: "🗓️ Letzte 30 Tage",
          range: [
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            new Date()
          ]
        },
        {
          label: "📆 Dieses Quartal",
          range: (() => {
            const now = new Date();
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            return [quarterStart, new Date()];
          })()
        }
      ];

      const container = document.createElement("div");
      container.style.marginBottom = "8px";

      presets.forEach(p => {
        const btn = document.createElement("button");
        btn.textContent = p.label;
        btn.style.marginRight = "0.5rem";
        btn.style.padding = "4px 8px";
        btn.style.fontSize = "0.9rem";
        btn.style.cursor = "pointer";
        btn.onclick = () => {
          instance.setDate(p.range, true);
        };
        container.appendChild(btn);
      });

      instance.calendarContainer.prepend(container);
    }
  });

  let tradeChart = null;
  function renderChartForRange(startDate, endDate) {
    const filtered = tradeList.filter(t => {
      const tDate = parseDate(t.time);
      return tDate >= startDate && tDate <= endDate;
    });

    filtered.sort((a, b) => a.time.localeCompare(b.time));

    let cumulativeBalance = 0;
    const timestamps = [];
    const balanceSeries = [];

    filtered.forEach((trade) => {
      cumulativeBalance += trade.profit;
      timestamps.push(trade.time);
      balanceSeries.push(cumulativeBalance);
    });

    const ctx2 = document.getElementById("chart-trades").getContext("2d");

    if (tradeChart) tradeChart.destroy();

    tradeChart = new Chart(ctx2, {
      type: "line",
      data: {
        labels: timestamps,
        datasets: [
          {
            label: "Kumulierte Balance (Zeitraum)",
            data: balanceSeries,
            borderColor: "rgb(54, 162, 235)",
            fill: false,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Trades vom ${startDate.toISOString().split("T")[0]} bis ${endDate.toISOString().split("T")[0]}`
          },
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: "Balance (kumuliert)"
            }
          },
          x: {
            title: {
              display: true,
              text: "Zeit"
            }
          }
        }
      }
    });

    updateTradeStats(filtered);
  }

  renderChartForRange(defaultStart, defaultEnd);
}
function updateTradeStats(filteredTrades) {
  if (filteredTrades.length === 0) {
    statsTradesBody.innerHTML = "<tr><td colspan='2' style='text-align:center'>Keine Trades im gewählten Zeitraum</td></tr>";
    return;
  }

  let cumulativeBalance = 0;
  const profits = [];
  filteredTrades.forEach(t => {
    cumulativeBalance += t.profit;
    profits.push(t.profit);
  });

  const totalProfit = profits.reduce((a, b) => a + b, 0);
  const avgProfit = totalProfit / profits.length;

  const maxProfit = Math.max(...profits);
  const minProfit = Math.min(...profits);

  const wins = profits.filter(p => p > 0).length;
  const losses = profits.filter(p => p <= 0).length;

  // Recovery Factor: Gewinn seit Start / max Drawdown (Drawdown aus Profiten als negative Summe)
  const maxDrawdown = (() => {
    let peak = 0;
    let drawdown = 0;
    let maxDD = 0;
    let running = 0;
    profits.forEach(p => {
      running += p;
      if (running > peak) peak = running;
      drawdown = peak - running;
      if (drawdown > maxDD) maxDD = drawdown;
    });
    return maxDD;
  })();
  const recoveryFactor = maxDrawdown > 0 ? totalProfit / maxDrawdown : "–";

  // Sharpe Ratio (vereinfachte Form, Gewinn pro Trade als Return)
  const returns = profits;
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.map(r => (r - avgReturn) ** 2).reduce((a, b) => a + b, 0) / returns.length
  );
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : "–";

  // Profit Factor (Summe Gewinne / Summe Verluste)
  const gains = profits.filter(r => r > 0).reduce((a, b) => a + b, 0);
  const lossesSum = profits.filter(r => r < 0).reduce((a, b) => a + b, 0);
  const profitFactor = lossesSum < 0 ? gains / Math.abs(lossesSum) : "–";

  const stats = [
    ["Anzahl Trades", filteredTrades.length],
    ["Gesamter Gewinn", totalProfit.toFixed(2) + " €"],
    ["Durchschnittlicher Gewinn", avgProfit.toFixed(2) + " €"],
    ["Maximaler Gewinn", maxProfit.toFixed(2) + " €"],
    ["Maximaler Verlust", minProfit.toFixed(2) + " €"],
    ["Gewonnene Trades", wins],
    ["Verlorene Trades", losses],
    ["Recovery Factor", typeof recoveryFactor === "number" ? recoveryFactor.toFixed(2) : recoveryFactor],
    ["Sharpe Ratio", typeof sharpeRatio === "number" ? sharpeRatio.toFixed(2) : sharpeRatio],
    ["Profit Factor", typeof profitFactor === "number" ? profitFactor.toFixed(2) : profitFactor]
  ];

  statsTradesBody.innerHTML = "";
  for (const [label, value] of stats) {
    const row = document.createElement("tr");
    const cell1 = document.createElement("td");
    const cell2 = document.createElement("td");
    cell1.textContent = label;
    cell2.textContent = value;
    cell2.style.textAlign = "right";
    row.appendChild(cell1);
    row.appendChild(cell2);
    statsTradesBody.appendChild(row);
  }
}


// Beide Funktionen starten
fetchData();
fetchTradeHistory();

// Tabs Umschalten
const tab1Btn = document.getElementById("tab1-btn");
const tab2Btn = document.getElementById("tab2-btn");
const tab1Content = document.getElementById("tab1");
const tab2Content = document.getElementById("tab2");

tab1Btn.addEventListener("click", () => {
  tab1Btn.classList.add("active");
  tab2Btn.classList.remove("active");
  tab1Content.classList.add("active");
  tab2Content.classList.remove("active");
});

tab2Btn.addEventListener("click", () => {
  tab2Btn.classList.add("active");
  tab1Btn.classList.remove("active");
  tab2Content.classList.add("active");
  tab1Content.classList.remove("active");
});

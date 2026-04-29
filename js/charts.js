// ============================================
// PESALENS — charts.js
// Builds all dashboard charts using Chart.js
// VaatiLabs 2026
// ============================================

const Charts = {

  // Store chart instances so we can destroy
  // and rebuild them when new data loads
  instances: {},


  // ── RENDER ALL CHARTS ─────────────────────
  renderAll(transactions) {
    this.destroyAll();
    this.renderDailyChart(transactions);
    this.renderCategoryChart(transactions);
    this.renderBalanceChart(transactions);
  },


  // ── DESTROY OLD CHARTS ────────────────────
  destroyAll() {
    Object.values(this.instances).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.instances = {};
  },


  // ── CHART DEFAULTS ────────────────────────
  getDefaults() {
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 12 },
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: '#010939',
          titleColor: '#ffffff',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,184,35,0.2)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (context) => {
              const val = context.parsed.y ?? context.parsed;
              return typeof val === 'number'
                ? ' KSh ' + val.toLocaleString('en-KE', {
                    minimumFractionDigits: 2
                  })
                : context.formattedValue;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 11 }
          },
          grid: {
            color: 'rgba(255,255,255,0.04)'
          }
        },
        y: {
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 11 },
            callback: (val) => 'KSh ' + val.toLocaleString('en-KE')
          },
          grid: {
            color: 'rgba(255,255,255,0.04)'
          }
        }
      }
    };
  },


  // ── CHART 1: DAILY INCOME VS EXPENSES ─────
  renderDailyChart(transactions) {
    const canvas = document.getElementById('daily-chart');
    if (!canvas) return;

    const dailyData = Categorizer.getDailyTotals(transactions);
    const labels = Object.keys(dailyData);
    const incomeData = labels.map(d => dailyData[d].in);
    const expenseData = labels.map(d => dailyData[d].out);

    // Show only last 30 days if too many
    const maxDays = 30;
    const slicedLabels = labels.slice(-maxDays);
    const slicedIncome = incomeData.slice(-maxDays);
    const slicedExpense = expenseData.slice(-maxDays);

    const defaults = this.getDefaults();

    this.instances.daily = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: slicedLabels,
        datasets: [
          {
            label: 'Income',
            data: slicedIncome,
            backgroundColor: 'rgba(22,163,74,0.7)',
            borderColor: '#16a34a',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Expenses',
            data: slicedExpense,
            backgroundColor: 'rgba(220,38,38,0.7)',
            borderColor: '#dc2626',
            borderWidth: 1,
            borderRadius: 4,
          }
        ]
      },
      options: {
        ...defaults,
        plugins: {
          ...defaults.plugins,
          legend: {
            ...defaults.plugins.legend,
            position: 'top'
          }
        },
        scales: {
          ...defaults.scales,
          x: {
            ...defaults.scales.x,
            stacked: false
          },
          y: {
            ...defaults.scales.y,
            beginAtZero: true
          }
        }
      }
    });
  },


  // ── CHART 2: EXPENSE CATEGORIES PIE ───────
  renderCategoryChart(transactions) {
    const canvas = document.getElementById('category-chart');
    if (!canvas) return;

    const categoryData = Categorizer.getCategoryTotals(transactions);
    const labels = Object.keys(categoryData);
    const values = Object.values(categoryData);

    if (labels.length === 0) {
      this.showEmptyMessage('category-chart', 'No expense data found');
      return;
    }

    // Colour palette using brand colours
    const colours = [
      '#ffb823', '#f59e0b', '#d97706',
      '#92400e', '#dc2626', '#b91c1c',
      '#16a34a', '#15803d', '#166534',
      '#2563eb', '#1d4ed8', '#94a3b8'
    ];

    this.instances.category = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colours.slice(0, labels.length),
          borderColor: '#020927',
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 11 },
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 8
            }
          },
          tooltip: {
            backgroundColor: '#010939',
            titleColor: '#ffffff',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255,184,35,0.2)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context) => {
                const total = context.dataset.data
                  .reduce((a, b) => a + b, 0);
                const pct = ((context.parsed / total) * 100).toFixed(1);
                const val = context.parsed.toLocaleString('en-KE', {
                  minimumFractionDigits: 2
                });
                return ` KSh ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  },


  // ── CHART 3: BALANCE OVER TIME LINE ───────
  renderBalanceChart(transactions) {
    const canvas = document.getElementById('balance-chart');
    if (!canvas) return;

    const balanceData = Categorizer.getBalanceOverTime(transactions);

    // Show only last 60 points if too many
    const maxPoints = 60;
    const sliced = balanceData.slice(-maxPoints);

    const labels = sliced.map(d => d.date);
    const values = sliced.map(d => d.balance);

    const defaults = this.getDefaults();

    this.instances.balance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Balance',
          data: values,
          borderColor: '#ffb823',
          backgroundColor: 'rgba(255,184,35,0.08)',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: '#ffb823',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        ...defaults,
        plugins: {
          ...defaults.plugins,
          legend: { display: false }
        },
        scales: {
          ...defaults.scales,
          y: {
            ...defaults.scales.y,
            beginAtZero: false
          }
        }
      }
    });
  },


  // ── EMPTY STATE MESSAGE ───────────────────
  showEmptyMessage(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.style.display = 'none';
    const msg = document.createElement('p');
    msg.style.cssText = `
      color: #94a3b8;
      font-size: 0.85rem;
      text-align: center;
      padding: 40px 0;
    `;
    msg.textContent = message;
    parent.appendChild(msg);
  }

};
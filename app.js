// ============================================
// PESALENS — app.js
// Main controller — connects everything
// VaatiLabs 2026
// ============================================

// ── DOM ELEMENTS ──────────────────────────
const uploadScreen    = document.getElementById('upload-screen');
const loadingScreen   = document.getElementById('loading-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const fileInput       = document.getElementById('file-input');
const chooseBtn       = document.getElementById('choose-btn');
const dropZone        = document.getElementById('drop-zone');
const demoBtn         = document.getElementById('demo-btn');
const backBtn         = document.getElementById('back-btn');
const errorMsg        = document.getElementById('error-msg');
const loadingText     = document.getElementById('loading-text');

// ── STORED DATA ───────────────────────────
let allTransactions = [];
let filteredTransactions = [];


// ── SCREEN SWITCHER ───────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}


// ── FILE UPLOAD TRIGGERS ──────────────────
chooseBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});


// ── DRAG AND DROP ─────────────────────────
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});


// ── HANDLE FILE ───────────────────────────
async function handleFile(file) {
  errorMsg.textContent = '';

  // Validate file type
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'pdf'].includes(ext)) {
    errorMsg.textContent = 'Please upload a CSV or PDF file only.';
    return;
  }

  // Show loading
  showScreen('loading-screen');
  loadingText.textContent = 'Reading your statement...';

  try {
    // Step 1 — Parse
    await delay(400);
    loadingText.textContent = 'Extracting transactions...';
    const rawTransactions = await Parser.parse(file);

    // Step 2 — Categorize
    await delay(400);
    loadingText.textContent = 'Categorizing transactions...';
    allTransactions = Categorizer.categorizeAll(rawTransactions);
    filteredTransactions = [...allTransactions];

    // Step 3 — Render dashboard
    await delay(300);
    loadingText.textContent = 'Building your dashboard...';
    renderDashboard();

    // Step 4 — Show dashboard
    await delay(300);
    showScreen('dashboard-screen');

  } catch (err) {
    showScreen('upload-screen');
    errorMsg.textContent = err.message;
  }
}


// ── RENDER DASHBOARD ──────────────────────
function renderDashboard() {
  // Statement period
  document.getElementById('statement-period').textContent =
    Parser.getStatementPeriod(allTransactions);

  // Summary cards
  const summary = Categorizer.getSummary(allTransactions);
  document.getElementById('total-in').textContent =
    Parser.formatKSh(summary.totalIn);
  document.getElementById('total-out').textContent =
    Parser.formatKSh(summary.totalOut);
  document.getElementById('net-balance').textContent =
    Parser.formatKSh(summary.net);
  document.getElementById('total-txn').textContent =
    summary.count.toLocaleString();

  // Top lists
  renderTopIncome();
  renderTopExpenses();

  // Transaction table
  renderTable(allTransactions);

  // Charts (from charts.js)
  if (typeof Charts !== 'undefined') {
    Charts.renderAll(allTransactions);
  }
}


// ── RENDER TOP INCOME ─────────────────────
function renderTopIncome() {
  const top = Categorizer.getTopIncome(allTransactions);
  const container = document.getElementById('top-income');

  if (top.length === 0) {
    container.innerHTML = '<p style="color:var(--grey);font-size:0.85rem;">No income found.</p>';
    return;
  }

  container.innerHTML = top.map(item => `
    <div class="top-row">
      <span class="top-name">${item.name}</span>
      <span class="top-amount in">${Parser.formatKSh(item.amount)}</span>
    </div>
  `).join('');
}


// ── RENDER TOP EXPENSES ───────────────────
function renderTopExpenses() {
  const top = Categorizer.getTopExpenses(allTransactions);
  const container = document.getElementById('top-expenses');

  if (top.length === 0) {
    container.innerHTML = '<p style="color:var(--grey);font-size:0.85rem;">No expenses found.</p>';
    return;
  }

  container.innerHTML = top.map(item => `
    <div class="top-row">
      <span class="top-name">${item.name}</span>
      <span class="top-amount out">${Parser.formatKSh(item.amount)}</span>
    </div>
  `).join('');
}


// ── RENDER TRANSACTION TABLE ──────────────
function renderTable(transactions) {
  const tbody = document.getElementById('txn-body');

  if (transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;color:var(--grey);padding:32px;">
          No transactions found.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = transactions.map(t => `
    <tr>
      <td style="color:var(--grey);white-space:nowrap;">
        ${new Date(t.date).toLocaleDateString('en-KE', {
          day: '2-digit', month: 'short', year: 'numeric'
        })}
      </td>
      <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        ${t.details}
      </td>
      <td><span class="badge ${t.type}">${t.type}</span></td>
      <td style="color:var(--grey);font-size:0.78rem;">${t.platform}</td>
      <td class="${t.paidIn > 0 ? 'amount-in' : ''}" style="white-space:nowrap;">
        ${t.paidIn > 0 ? Parser.formatKSh(t.paidIn) : '—'}
      </td>
      <td class="${t.withdrawn > 0 ? 'amount-out' : ''}" style="white-space:nowrap;">
        ${t.withdrawn > 0 ? Parser.formatKSh(t.withdrawn) : '—'}
      </td>
      <td style="color:var(--grey);white-space:nowrap;">
        ${t.balance > 0 ? Parser.formatKSh(t.balance) : '—'}
      </td>
    </tr>
  `).join('');
}


// ── SEARCH ────────────────────────────────
document.getElementById('search-input')
  .addEventListener('input', applyFilters);

document.getElementById('filter-type')
  .addEventListener('change', applyFilters);

function applyFilters() {
  const query = document.getElementById('search-input')
    .value.toLowerCase();
  const type = document.getElementById('filter-type').value;

  filteredTransactions = allTransactions.filter(t => {
    const matchSearch = t.details.toLowerCase().includes(query) ||
                        t.type.toLowerCase().includes(query) ||
                        t.category.toLowerCase().includes(query);
    const matchType = type === 'all' || t.type === type;
    return matchSearch && matchType;
  });

  renderTable(filteredTransactions);
}


// ── BACK BUTTON ───────────────────────────
backBtn.addEventListener('click', () => {
  allTransactions = [];
  filteredTransactions = [];
  fileInput.value = '';
  errorMsg.textContent = '';
  showScreen('upload-screen');
});


// ── DEMO BUTTON ───────────────────────────
demoBtn.addEventListener('click', () => {
  const demoData = generateDemoData();
  allTransactions = Categorizer.categorizeAll(demoData);
  filteredTransactions = [...allTransactions];
  renderDashboard();
  showScreen('dashboard-screen');
});


// ── GENERATE DEMO DATA ────────────────────
function generateDemoData() {
  const now = new Date();
  const demos = [
    { days:1,  details:'Funds received from JOHN KAMAU 0722123456',  paidIn:2500,  withdrawn:0,     balance:15000 },
    { days:1,  details:'Pay Bill to 888880 - KENYA POWER',           paidIn:0,     withdrawn:1200,  balance:13800 },
    { days:2,  details:'Funds received from GRACE WANJIKU 0733456789',paidIn:5000,  withdrawn:0,     balance:18800 },
    { days:2,  details:'Customer Transfer to PETER MWANGI',          paidIn:0,     withdrawn:800,   balance:18000 },
    { days:3,  details:'Airtime Purchase',                            paidIn:0,     withdrawn:100,   balance:17900 },
    { days:3,  details:'Funds received from MARY NJERI 0711789012',  paidIn:3200,  withdrawn:0,     balance:21100 },
    { days:4,  details:'Pay Bill to 400200 - NAIROBI WATER',         paidIn:0,     withdrawn:500,   balance:20600 },
    { days:4,  details:'Deposit of Funds at Agent 714429',           paidIn:5000,  withdrawn:0,     balance:25600 },
    { days:5,  details:'Funds received from DAVID OCHIENG 0712345678',paidIn:1800,  withdrawn:0,     balance:27400 },
    { days:5,  details:'Buy Goods from Till 5678901',                paidIn:0,     withdrawn:450,   balance:26950 },
    { days:6,  details:'Customer Transfer to ALICE KAMAU',           paidIn:0,     withdrawn:2000,  balance:24950 },
    { days:6,  details:'Funds received from JAMES MWENDA 0722987654',paidIn:7500,  withdrawn:0,     balance:32450 },
    { days:7,  details:'Pay Bill to 111011 - DSTV',                  paidIn:0,     withdrawn:1500,  balance:30950 },
    { days:7,  details:'Withdrawal at Agent 891234',                 paidIn:0,     withdrawn:3000,  balance:27950 },
    { days:8,  details:'Funds received from SARAH WEKESA 0733123456',paidIn:4500,  withdrawn:0,     balance:32450 },
    { days:8,  details:'Transaction Cost',                           paidIn:0,     withdrawn:29,    balance:32421 },
    { days:9,  details:'Pay Bill to 200999 - ZUKU FIBER',            paidIn:0,     withdrawn:2500,  balance:29921 },
    { days:9,  details:'Funds received from BRIAN KIPROP 0711234567',paidIn:3000,  withdrawn:0,     balance:32921 },
    { days:10, details:'Buy Goods from Till 1234567',                paidIn:0,     withdrawn:780,   balance:32141 },
    { days:10, details:'Funds received from LUCY ACHIENG 0722345678',paidIn:6000,  withdrawn:0,     balance:38141 },
  ];

  return demos.map((d, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (30 - d.days));
    return {
      receiptNo: `TXN${String(i+1).padStart(6,'0')}`,
      date,
      dateRaw: date.toISOString(),
      details: d.details,
      status: 'Completed',
      paidIn: d.paidIn,
      withdrawn: d.withdrawn,
      balance: d.balance,
      type: null,
      category: null,
      platform: null
    };
  });
}


// ── EXPORT PDF ────────────────────────────
document.getElementById('export-btn').addEventListener('click', () => {
  if (typeof Exporter !== 'undefined') {
    Exporter.exportPDF(allTransactions);
  } else {
    alert('Export feature coming in Day 3!');
  }
});


// ── UTILITY: DELAY ────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
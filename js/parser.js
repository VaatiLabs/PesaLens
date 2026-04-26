// ============================================
// PESALENS — parser.js
// Reads CSV and PDF M-Pesa statements
// VaatiLabs 2026
// ============================================

const Parser = {

  // ── MAIN ENTRY POINT ──────────────────────
  // Called by app.js when user uploads a file
  async parse(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      return await this.parseCSV(file);
    } else if (extension === 'pdf') {
      return await this.parsePDF(file);
    } else {
      throw new Error('Unsupported file type. Please upload a CSV or PDF.');
    }
  },


  // ── CSV PARSER ────────────────────────────
  parseCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const transactions = this.extractFromText(text);
          resolve(transactions);
        } catch (err) {
          reject(new Error('Could not read CSV file. Please check the file and try again.'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    });
  },


  // ── PDF PARSER ────────────────────────────
  async parsePDF(file) {
    try {
      // Set PDF.js worker
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';

      // Extract text from every page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      const transactions = this.extractFromText(fullText);
      return transactions;

    } catch (err) {
      throw new Error('Could not read PDF. If password protected, please use the CSV version.');
    }
  },


  // ── EXTRACT TRANSACTIONS FROM RAW TEXT ────
  extractFromText(text) {
    const lines = text.split('\n');
    const transactions = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and headers
      if (!line) continue;
      if (this.isHeaderLine(line)) continue;

      const txn = this.parseLine(line);
      if (txn) transactions.push(txn);
    }

    if (transactions.length === 0) {
      throw new Error(
        'No transactions found. Make sure you uploaded a valid M-Pesa statement.'
      );
    }

    // Sort by date oldest to newest
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    return transactions;
  },


  // ── PARSE A SINGLE LINE ───────────────────
  parseLine(line) {
    try {
      // M-Pesa CSV columns:
      // Receipt No. | Completion Time | Details | Status | Paid In | Withdrawn | Balance

      const cols = this.splitCSVLine(line);

      if (cols.length < 6) return null;

      const receiptNo    = cols[0]?.trim() || '';
      const dateRaw      = cols[1]?.trim() || '';
      const details      = cols[2]?.trim() || '';
      const status       = cols[3]?.trim() || '';
      const paidIn       = this.parseAmount(cols[4]);
      const withdrawn    = this.parseAmount(cols[5]);
      const balance      = this.parseAmount(cols[6]);

      // Skip if no receipt number (not a transaction row)
      if (!receiptNo || receiptNo.length < 6) return null;

      // Skip failed transactions
      if (status && status.toLowerCase().includes('failed')) return null;

      // Parse the date
      const date = this.parseDate(dateRaw);
      if (!date) return null;

      return {
        receiptNo,
        date,
        dateRaw,
        details,
        status,
        paidIn,
        withdrawn,
        balance,
        type: null,       // filled by categorizer.js
        category: null,   // filled by categorizer.js
        platform: null,   // filled by categorizer.js
      };

    } catch (err) {
      return null; // skip unparseable lines silently
    }
  },


  // ── SPLIT CSV LINE (handles commas in quotes)
  splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  },


  // ── PARSE AMOUNT ──────────────────────────
  // Converts "1,234.56" or "1234.56" to number
  parseAmount(raw) {
    if (!raw || raw.trim() === '' || raw.trim() === '-') return 0;
    const cleaned = raw.replace(/,/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  },


  // ── PARSE DATE ────────────────────────────
  parseDate(raw) {
    if (!raw) return null;

    // Try formats:
    // "2025-04-27 14:32:00"
    // "27/04/2025 14:32:00"
    // "Apr 27, 2025"

    let date = new Date(raw);

    if (isNaN(date.getTime())) {
      // Try DD/MM/YYYY format
      const parts = raw.split(/[\/\-\s]/);
      if (parts.length >= 3) {
        const d = parts[0], m = parts[1], y = parts[2];
        date = new Date(`${y}-${m}-${d}`);
      }
    }

    return isNaN(date.getTime()) ? null : date;
  },


  // ── DETECT HEADER LINES ───────────────────
  isHeaderLine(line) {
    const headers = [
      'receipt', 'completion', 'transaction',
      'details', 'status', 'paid in', 'withdrawn',
      'balance', 'mpesa', 'm-pesa', 'safaricom',
      'statement', 'customer', 'account'
    ];

    const lower = line.toLowerCase();
    return headers.some(h => lower.startsWith(h));
  },


  // ── GET STATEMENT PERIOD ──────────────────
  // Returns "Jan 2025 – Mar 2025" from transactions
  getStatementPeriod(transactions) {
    if (!transactions.length) return '—';

    const dates = transactions.map(t => new Date(t.date));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));

    const fmt = (d) => d.toLocaleDateString('en-KE', {
      month: 'short',
      year: 'numeric'
    });

    if (fmt(min) === fmt(max)) return fmt(min);
    return `${fmt(min)} – ${fmt(max)}`;
  },


  // ── FORMAT CURRENCY ───────────────────────
  formatKSh(amount) {
    return 'KSh ' + amount.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

};
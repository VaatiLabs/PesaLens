// ============================================
// PESALENS — categorizer.js
// Detects transaction type and platform
// VaatiLabs 2026
// ============================================

const Categorizer = {

  // ── MAIN ENTRY POINT ──────────────────────
  // Categorizes all transactions
  categorizeAll(transactions) {
    return transactions.map(txn => {
      const result = this.categorize(txn.details, txn.paidIn, txn.withdrawn);
      return { ...txn, ...result };
    });
  },


  // ── CATEGORIZE ONE TRANSACTION ────────────
  categorize(details, paidIn, withdrawn) {
    const d = (details || '').toLowerCase();

    // ── INCOME ────────────────────────────
    if (d.includes('funds received from') ||
        d.includes('received from')) {
      return {
        type: 'INCOME',
        category: 'Money Received',
        platform: paidIn > 0 ? 'Pochi la Biashara / Send Money' : 'Send Money'
      };
    }

    if (d.includes('pay bill') && paidIn > 0) {
      return {
        type: 'INCOME',
        category: 'Paybill Collection',
        platform: 'Paybill'
      };
    }

    if (d.includes('buy goods') && paidIn > 0) {
      return {
        type: 'INCOME',
        category: 'Till Collection',
        platform: 'Lipa na M-Pesa Till'
      };
    }

    if (d.includes('merchant payment') && paidIn > 0) {
      return {
        type: 'INCOME',
        category: 'Till Collection',
        platform: 'Lipa na M-Pesa Till'
      };
    }

    if (d.includes('business payment') && paidIn > 0) {
      return {
        type: 'INCOME',
        category: 'Business Payment',
        platform: 'Pochi la Biashara'
      };
    }

    // ── TRANSFERS (not income or expense) ──
    if (d.includes('deposit of funds') ||
        d.includes('cash deposit') ||
        d.includes('agent deposit')) {
      return {
        type: 'TRANSFER',
        category: 'Agent Deposit',
        platform: 'Agent'
      };
    }

    if (d.includes('withdrawal') ||
        d.includes('agent withdrawal') ||
        d.includes('atm withdrawal')) {
      return {
        type: 'TRANSFER',
        category: 'Cash Withdrawal',
        platform: 'Agent / ATM'
      };
    }

    if (d.includes('transfer to') && d.includes('account')) {
      return {
        type: 'TRANSFER',
        category: 'Bank Transfer',
        platform: 'Bank'
      };
    }

    // ── EXPENSES ──────────────────────────
    if (d.includes('pay bill') && withdrawn > 0) {
      const name = this.extractPaybillName(details);
      return {
        type: 'EXPENSE',
        category: this.classifyPaybill(d),
        platform: `Paybill — ${name}`
      };
    }

    if ((d.includes('buy goods') || d.includes('merchant payment')) &&
        withdrawn > 0) {
      return {
        type: 'EXPENSE',
        category: 'Goods Purchase',
        platform: 'Lipa na M-Pesa Till'
      };
    }

    if (d.includes('customer transfer to') ||
        d.includes('send money to') ||
        d.includes('funds sent to')) {
      return {
        type: 'EXPENSE',
        category: 'Money Sent',
        platform: 'Send Money'
      };
    }

    if (d.includes('airtime') || d.includes('bundle') ||
        d.includes('data bundle')) {
      return {
        type: 'EXPENSE',
        category: 'Airtime & Data',
        platform: 'Safaricom'
      };
    }

    if (d.includes('fuliza') || d.includes('overdraft')) {
      return {
        type: 'EXPENSE',
        category: 'Fuliza Repayment',
        platform: 'Fuliza'
      };
    }

    if (d.includes('transaction cost') ||
        d.includes('charge') ||
        d.includes('fee')) {
      return {
        type: 'EXPENSE',
        category: 'Transaction Fees',
        platform: 'Safaricom'
      };
    }

    if (d.includes('m-shwari') || d.includes('mshwari')) {
      return {
        type: withdrawn > 0 ? 'EXPENSE' : 'INCOME',
        category: withdrawn > 0 ? 'M-Shwari Deposit' : 'M-Shwari Withdrawal',
        platform: 'M-Shwari'
      };
    }

    if (d.includes('kcb') || d.includes('equity') ||
        d.includes('cooperative') || d.includes('stanchart') ||
        d.includes('barclays') || d.includes('absa')) {
      return {
        type: 'TRANSFER',
        category: 'Bank Transfer',
        platform: 'Bank'
      };
    }

    // ── FALLBACK ──────────────────────────
    return {
      type: withdrawn > 0 ? 'EXPENSE' : paidIn > 0 ? 'INCOME' : 'OTHER',
      category: 'Uncategorized',
      platform: 'M-Pesa'
    };
  },


  // ── EXTRACT PAYBILL NAME ──────────────────
  extractPaybillName(details) {
    // "Pay Bill to 123456 - KENYA POWER"
    // → returns "KENYA POWER"
    const match = details.match(/to\s+\d+\s*[-–]\s*(.+)/i);
    if (match) return match[1].trim();

    // "Pay Bill to KENYA POWER"
    const match2 = details.match(/to\s+([A-Z\s]+)/i);
    if (match2) return match2[1].trim();

    return 'Paybill Merchant';
  },


  // ── CLASSIFY PAYBILL CATEGORY ─────────────
  classifyPaybill(details) {
    const d = details.toLowerCase();

    if (d.includes('kplc') || d.includes('kenya power') ||
        d.includes('power') || d.includes('electric')) {
      return 'Electricity (KPLC)';
    }

    if (d.includes('water') || d.includes('nairobi water') ||
        d.includes('nawasco')) {
      return 'Water Bill';
    }

    if (d.includes('school') || d.includes('college') ||
        d.includes('university') || d.includes('fees')) {
      return 'School Fees';
    }

    if (d.includes('rent') || d.includes('landlord') ||
        d.includes('property')) {
      return 'Rent Payment';
    }

    if (d.includes('dstv') || d.includes('gotv') ||
        d.includes('showmax') || d.includes('netflix') ||
        d.includes('pay tv')) {
      return 'Entertainment';
    }

    if (d.includes('nhif') || d.includes('health') ||
        d.includes('hospital') || d.includes('clinic')) {
      return 'Healthcare';
    }

    if (d.includes('nssf') || d.includes('pension')) {
      return 'Pension / NSSF';
    }

    if (d.includes('zuku') || d.includes('safaricom home') ||
        d.includes('faiba') || d.includes('internet')) {
      return 'Internet Bill';
    }

    if (d.includes('nairobi') || d.includes('county') ||
        d.includes('government') || d.includes('kra')) {
      return 'Government / Tax';
    }

    return 'Paybill Payment';
  },


  // ── COMPUTE SUMMARY TOTALS ─────────────────
  getSummary(transactions) {
    let totalIn = 0;
    let totalOut = 0;

    transactions.forEach(txn => {
      if (txn.type === 'INCOME') totalIn += txn.paidIn;
      if (txn.type === 'EXPENSE') totalOut += txn.withdrawn;
    });

    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      count: transactions.length
    };
  },


  // ── GET TOP INCOME SOURCES ─────────────────
  getTopIncome(transactions, limit = 5) {
    const map = {};

    transactions
      .filter(t => t.type === 'INCOME')
      .forEach(t => {
        const name = this.extractSenderName(t.details);
        map[name] = (map[name] || 0) + t.paidIn;
      });

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, amount]) => ({ name, amount }));
  },


  // ── GET TOP EXPENSES ───────────────────────
  getTopExpenses(transactions, limit = 5) {
    const map = {};

    transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const name = t.category || 'Other';
        map[name] = (map[name] || 0) + t.withdrawn;
      });

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, amount]) => ({ name, amount }));
  },


  // ── EXTRACT SENDER NAME ────────────────────
  extractSenderName(details) {
    // "Funds received from JOHN DOE 0722..."
    const match = details.match(/from\s+([A-Z][A-Z\s]+?)(?:\s+\d|$)/i);
    if (match) return match[1].trim();
    return 'Unknown Sender';
  },


  // ── GET DAILY TOTALS (for bar chart) ───────
  getDailyTotals(transactions) {
    const map = {};

    transactions.forEach(txn => {
      const day = new Date(txn.date).toLocaleDateString('en-KE', {
        day: '2-digit', month: 'short'
      });

      if (!map[day]) map[day] = { in: 0, out: 0 };
      if (txn.type === 'INCOME') map[day].in += txn.paidIn;
      if (txn.type === 'EXPENSE') map[day].out += txn.withdrawn;
    });

    return map;
  },


  // ── GET CATEGORY TOTALS (for pie chart) ────
  getCategoryTotals(transactions) {
    const map = {};

    transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const cat = t.category || 'Other';
        map[cat] = (map[cat] || 0) + t.withdrawn;
      });

    return map;
  },


  // ── GET BALANCE OVER TIME (for line chart) ─
  getBalanceOverTime(transactions) {
    return transactions.map(t => ({
      date: new Date(t.date).toLocaleDateString('en-KE', {
        day: '2-digit', month: 'short'
      }),
      balance: t.balance
    }));
  }

};
// ============================================
// PESALENS — exporter.js
// Exports dashboard as PDF using jsPDF
// VaatiLabs 2026
// ============================================

const Exporter = {

  exportPDF(transactions) {
    if (!transactions || transactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // ── COLOURS ───────────────────────────
    const navy  = [2, 9, 39];
    const gold  = [255, 184, 35];
    const white = [255, 255, 255];
    const grey  = [148, 163, 184];
    const green = [22, 163, 74];
    const red   = [220, 38, 38];

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = 0;


    // ── HEADER BACKGROUND ─────────────────
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageW, 40, 'F');

    // Logo
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);
    doc.text('Pesa', 14, 22);

    doc.setTextColor(...gold);
    doc.text('Lens', 14 + doc.getTextWidth('Pesa'), 22);

    // Subtitle
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grey);
    doc.text('M-Pesa Statement Analysis Report', 14, 32);

    // Date generated
    const today = new Date().toLocaleDateString('en-KE', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    doc.text(`Generated: ${today}`, pageW - 14, 32, { align: 'right' });

    // Statement period
    const period = Parser.getStatementPeriod(transactions);
    doc.setFontSize(10);
    doc.setTextColor(...white);
    doc.text(`Period: ${period}`, pageW - 14, 22, { align: 'right' });

    y = 52;


    // ── SUMMARY CARDS ─────────────────────
    const summary = Categorizer.getSummary(transactions);

    const cards = [
      { label: 'Total In',      value: Parser.formatKSh(summary.totalIn),  color: green },
      { label: 'Total Out',     value: Parser.formatKSh(summary.totalOut), color: red   },
      { label: 'Net Balance',   value: Parser.formatKSh(summary.net),      color: gold  },
      { label: 'Transactions',  value: summary.count.toString(),           color: grey  },
    ];

    const cardW = (pageW - 28 - 9) / 4;

    cards.forEach((card, i) => {
      const x = 14 + i * (cardW + 3);

      // Card background
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(x, y, cardW, 24, 2, 2, 'F');

      // Left border accent
      doc.setFillColor(...card.color);
      doc.rect(x, y, 2, 24, 'F');

      // Label
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grey);
      doc.text(card.label.toUpperCase(), x + 5, y + 8);

      // Value
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text(card.value, x + 5, y + 18);
    });

    y += 34;


    // ── TOP INCOME & EXPENSES ─────────────
    const topIncome   = Categorizer.getTopIncome(transactions, 5);
    const topExpenses = Categorizer.getTopExpenses(transactions, 5);
    const colW = (pageW - 28 - 8) / 2;

    // Section title
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text('TOP INCOME SOURCES', 14, y);
    doc.text('TOP EXPENSES', 14 + colW + 8, y);
    y += 6;

    // Gold underline
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(14, y, 14 + colW, y);
    doc.line(14 + colW + 8, y, 14 + colW + 8 + colW, y);
    y += 5;

    const maxRows = Math.max(topIncome.length, topExpenses.length);

    for (let i = 0; i < maxRows; i++) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      if (topIncome[i]) {
        doc.setTextColor(...navy);
        doc.text(
          topIncome[i].name.substring(0, 22),
          14, y
        );
        doc.setTextColor(...green);
        doc.text(
          Parser.formatKSh(topIncome[i].amount),
          14 + colW, y, { align: 'right' }
        );
      }

      if (topExpenses[i]) {
        doc.setTextColor(...navy);
        doc.text(
          topExpenses[i].name.substring(0, 22),
          14 + colW + 8, y
        );
        doc.setTextColor(...red);
        doc.text(
          Parser.formatKSh(topExpenses[i].amount),
          14 + colW + 8 + colW, y, { align: 'right' }
        );
      }

      y += 7;
    }

    y += 6;


    // ── TRANSACTION TABLE ─────────────────
    // Table header background
    doc.setFillColor(...navy);
    doc.rect(14, y, pageW - 28, 8, 'F');

    // Table headers
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);

    const cols = {
      date:      { x: 16,  w: 22 },
      details:   { x: 40,  w: 70 },
      type:      { x: 112, w: 20 },
      paidIn:    { x: 134, w: 28 },
      withdrawn: { x: 164, w: 28 },
      balance:   { x: 192, w: 28 },
    };

    doc.text('DATE',        cols.date.x,      y + 5.5);
    doc.text('DETAILS',     cols.details.x,   y + 5.5);
    doc.text('TYPE',        cols.type.x,      y + 5.5);
    doc.text('PAID IN',     cols.paidIn.x,    y + 5.5);
    doc.text('WITHDRAWN',   cols.withdrawn.x, y + 5.5);
    doc.text('BALANCE',     cols.balance.x,   y + 5.5);

    y += 10;

    // Table rows
    transactions.forEach((txn, index) => {
      // New page if needed
      if (y > pageH - 20) {
        doc.addPage();
        y = 16;

        // Repeat header on new page
        doc.setFillColor(...navy);
        doc.rect(14, y, pageW - 28, 8, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...white);
        doc.text('DATE',      cols.date.x,      y + 5.5);
        doc.text('DETAILS',   cols.details.x,   y + 5.5);
        doc.text('TYPE',      cols.type.x,      y + 5.5);
        doc.text('PAID IN',   cols.paidIn.x,    y + 5.5);
        doc.text('WITHDRAWN', cols.withdrawn.x, y + 5.5);
        doc.text('BALANCE',   cols.balance.x,   y + 5.5);
        y += 10;
      }

      // Alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 2, pageW - 28, 7, 'F');
      }

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');

      // Date
      doc.setTextColor(...grey);
      doc.text(
        new Date(txn.date).toLocaleDateString('en-KE', {
          day: '2-digit', month: 'short', year: '2-digit'
        }),
        cols.date.x, y + 3
      );

      // Details (truncated)
      doc.setTextColor(...navy);
      const detailText = txn.details.length > 38
        ? txn.details.substring(0, 38) + '...'
        : txn.details;
      doc.text(detailText, cols.details.x, y + 3);

      // Type badge color
      const typeColor = txn.type === 'INCOME'
        ? green : txn.type === 'EXPENSE'
        ? red : grey;
      doc.setTextColor(...typeColor);
      doc.setFont('helvetica', 'bold');
      doc.text(txn.type, cols.type.x, y + 3);

      // Amounts
      doc.setFont('helvetica', 'normal');

      if (txn.paidIn > 0) {
        doc.setTextColor(...green);
        doc.text(
          Parser.formatKSh(txn.paidIn),
          cols.paidIn.x + cols.paidIn.w, y + 3,
          { align: 'right' }
        );
      } else {
        doc.setTextColor(...grey);
        doc.text('—', cols.paidIn.x + cols.paidIn.w, y + 3, { align: 'right' });
      }

      if (txn.withdrawn > 0) {
        doc.setTextColor(...red);
        doc.text(
          Parser.formatKSh(txn.withdrawn),
          cols.withdrawn.x + cols.withdrawn.w, y + 3,
          { align: 'right' }
        );
      } else {
        doc.setTextColor(...grey);
        doc.text('—', cols.withdrawn.x + cols.withdrawn.w, y + 3, { align: 'right' });
      }

      doc.setTextColor(...grey);
      doc.text(
        txn.balance > 0 ? Parser.formatKSh(txn.balance) : '—',
        cols.balance.x + cols.balance.w, y + 3,
        { align: 'right' }
      );

      y += 7;
    });


    // ── FOOTER ────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grey);
      doc.text(
        'Generated by PesaLens · vaatilabs.github.io/PesaLens · Data processed locally. Never transmitted.',
        14, pageH - 8
      );
      doc.text(
        `Page ${p} of ${totalPages}`,
        pageW - 14, pageH - 8, { align: 'right' }
      );
    }


    // ── SAVE ──────────────────────────────
    const filename = `PesaLens-Report-${period.replace(/\s/g, '-')}.pdf`;
    doc.save(filename);
  }

};
   function renderHeroSparkline(){
      const el = $('#heroSaldoSparkline');
      if (!el) return;
      // Destroy old chart if exists
      if (el.chart) {
        el.chart.destroy();
        el.chart = null;
      }

      const txs = getTransactionsInPeriod();
      if (txs.length < 2) return;

      // Aggregate daily net values
      const dailyNet = {};
      for (const tx of txs) {
        const date = tx.date;
        dailyNet[date] = (dailyNet[date] || 0) + calculateTxNet(tx);
      }

      const sortedDates = Object.keys(dailyNet).sort();
      const data = sortedDates.map(date => dailyNet[date]);

      const ctx = el.getContext('2d');
      el.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: sortedDates,
          datasets: [{
            data: data,
            borderColor: 'rgba(52,211,153,1)',
            backgroundColor: 'rgba(52,211,153,0.2)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
          },
          scales: {
            x: { display: false },
            y: { display: false },
          },
          layout: {
            padding: {
              left: 0,
              right: 0,
              top: 5,
              bottom: 5
            }
          }
        }
      });
    }

    function renderHeroSparklineDesktop(){
      const el = $('#heroSaldoSparklineDesktop');
      if (!el) return;
      // Destroy old chart if exists
      if (el.chart) {
        el.chart.destroy();
        el.chart = null;
      }

      const txs = getTransactionsInPeriod();
      if (txs.length < 2) return;

      // Aggregate daily net values
      const dailyNet = {};
      for (const tx of txs) {
        const date = tx.date;
        dailyNet[date] = (dailyNet[date] || 0) + calculateTxNet(tx);
      }

      const sortedDates = Object.keys(dailyNet).sort();
      const data = sortedDates.map(date => dailyNet[date]);

      const ctx = el.getContext('2d');
      el.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: sortedDates,
          datasets: [{
            data: data,
            borderColor: 'rgba(52,211,153,1)',
            backgroundColor: 'rgba(52,211,153,0.2)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
          },
          scales: {
            x: { display: false },
            y: { display: false },
          },
          layout: {
            padding: {
              left: 0,
              right: 0,
              top: 5,
              bottom: 5
            }
          }
        }
      });
    }

/**
 * CoolGym — pages/admin.js
 * Admin dashboard: Chart.js charts loaded from API
 */

(function () {
  'use strict';

  const signupCanvas = document.getElementById('signupChart');
  const distCanvas   = document.getElementById('distChart');

  if (!signupCanvas && !distCanvas) return;

  fetch('/admin/api/stats')
    .then(r => r.json())
    .then(data => {

      /* ── Signup line chart ── */
      if (signupCanvas) {
        new Chart(signupCanvas, {
          type: 'line',
          data: {
            labels: data.signups.map(d => d.date),
            datasets: [{
              label: 'Signups',
              data:  data.signups.map(d => d.count),
              borderColor: '#E8FF00',
              backgroundColor: 'rgba(232,255,0,0.07)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#E8FF00',
              pointRadius: 3,
              pointHoverRadius: 6,
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1a1a1a',
                borderColor: '#333',
                borderWidth: 1,
                titleColor: '#E8FF00',
                bodyColor: '#ccc',
                padding: 10,
              }
            },
            scales: {
              x: {
                ticks: { color: '#6b7280', font: { size: 10 } },
                grid:  { color: '#1f2937' }
              },
              y: {
                ticks: { color: '#6b7280', font: { size: 10 }, stepSize: 1 },
                grid:  { color: '#1f2937' },
                beginAtZero: true
              }
            },
            interaction: { intersect: false, mode: 'index' },
            animation: { duration: 1000, easing: 'easeOutQuart' },
          }
        });
      }

      /* ── Membership doughnut chart ── */
      if (distCanvas) {
        new Chart(distCanvas, {
          type: 'doughnut',
          data: {
            labels: Object.keys(data.distribution),
            datasets: [{
              data: Object.values(data.distribution),
              backgroundColor: ['#fbbf24', '#a78bfa', '#E8FF00', '#374151'],
              borderWidth: 0,
              hoverOffset: 8,
            }]
          },
          options: {
            cutout: '72%',
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1a1a1a',
                borderColor: '#333',
                borderWidth: 1,
                titleColor: '#fff',
                bodyColor: '#ccc',
                padding: 10,
              }
            },
            responsive: true,
            animation: { duration: 1000, easing: 'easeOutQuart' },
          }
        });
      }

    })
    .catch(err => console.error('Stats fetch failed:', err));

})();

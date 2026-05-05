/**
 * CoolGym — pages/classes.js
 * Classes page: filter tabs, card hover, schedule highlight
 */

(function () {
  'use strict';

  /* ── Highlight today's column in schedule table ── */
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today    = dayNames[new Date().getDay()];
  const headers  = document.querySelectorAll('#schedule-table thead th');

  headers.forEach((th, i) => {
    if (th.textContent.trim() === today) {
      th.style.color      = '#E8FF00';
      th.style.fontWeight = '700';

      // Highlight all cells in that column
      document.querySelectorAll(`#schedule-table tbody tr`).forEach(row => {
        const cell = row.querySelectorAll('td')[i];
        if (cell) {
          cell.style.background = 'rgba(232,255,0,0.04)';
        }
      });
    }
  });

  /* ── Level filter tabs ── */
  const filterBtns = document.querySelectorAll('[data-filter]');
  const classCards = document.querySelectorAll('[data-level]');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      // Update active button style
      filterBtns.forEach(b => {
        b.classList.remove('brand-bg', 'text-black');
        b.classList.add('border-gray-600', 'text-gray-300');
      });
      btn.classList.add('brand-bg', 'text-black');
      btn.classList.remove('border-gray-600', 'text-gray-300');

      // Show/hide cards with fade
      classCards.forEach(card => {
        const match = filter === 'all' || card.dataset.level === filter;
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        if (match) {
          card.style.opacity   = '1';
          card.style.transform = 'scale(1)';
          card.style.display   = '';
        } else {
          card.style.opacity   = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(() => {
            if (!match) card.style.display = 'none';
          }, 300);
        }
      });
    });
  });

})();

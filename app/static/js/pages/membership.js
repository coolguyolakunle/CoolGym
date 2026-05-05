/**
 * CoolGym — pages/membership.js
 */

(function () {
  'use strict';

  /* ── Smooth FAQ accordion ── */
  document.querySelectorAll('#faq .accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel  = btn.nextElementSibling;
      const arrow  = btn.querySelector('.accordion-arrow');
      const isOpen = !panel.classList.contains('accordion-closed');

      // Close all
      document.querySelectorAll('#faq .accordion-panel').forEach(p => {
        p.style.maxHeight = '0';
        p.classList.add('accordion-closed');
      });
      document.querySelectorAll('#faq .accordion-arrow').forEach(a => {
        a.style.transform = '';
      });

      // Open clicked (if it was closed)
      if (isOpen) return;
      panel.classList.remove('accordion-closed');
      panel.style.maxHeight = panel.scrollHeight + 'px';
      if (arrow) arrow.style.transform = 'rotate(180deg)';
    });
  });

})();

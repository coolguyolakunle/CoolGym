/**
 * Flexova — pages/home.js
 * Homepage-specific JS: typewriter hero, scroll hint, stagger trigger
 */

(function () {
  'use strict';

  /* ── Typewriter cycling words ── */
  const words   = ['STARTS', 'BEGINS', 'HAPPENS', 'LIVES'];
  const el      = document.getElementById('typewriter-word');

  if (el) {
    let wordIndex = 0;
    let charIndex = words[0].length;
    let deleting  = true;

    function typewrite() {
      const current = words[wordIndex];
      if (!deleting) {
        el.textContent = current.slice(0, ++charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(typewrite, 2200);
          return;
        }
      } else {
        el.textContent = current.slice(0, --charIndex);
        if (charIndex === 0) {
          deleting   = false;
          wordIndex  = (wordIndex + 1) % words.length;
        }
      }
      setTimeout(typewrite, deleting ? 55 : 105);
    }
    setTimeout(typewrite, 2000);
  }

  /* ── Hide scroll hint on scroll ── */
  const hint = document.getElementById('scroll-hint');
  if (hint) {
    window.addEventListener('scroll', () => {
      hint.style.opacity    = window.scrollY > 60 ? '0' : '1';
      hint.style.transition = 'opacity 0.5s ease';
    }, { passive: true });
  }

})();

/**
 * CoolGym — pages/home.js
 * Homepage-specific JS: typewriter hero, scroll hint, stagger trigger
 */

(function () {
  'use strict';

  /* ── Typewriter cycling words ── */
  /* Hero background video crossfade */
  const heroVideo1 = document.getElementById('heroVideo1');
  const heroVideo2 = document.getElementById('heroVideo2');

  if (heroVideo1 && heroVideo2) {
    let showFirstVideo = true;

    [heroVideo1, heroVideo2].forEach((video) => {
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => {
        // Some browsers defer autoplay until the page settles; the poster remains visible.
      });
    });

    setInterval(() => {
      showFirstVideo = !showFirstVideo;
      heroVideo1.classList.toggle('opacity-0', !showFirstVideo);
      heroVideo1.classList.toggle('opacity-100', showFirstVideo);
      heroVideo2.classList.toggle('opacity-0', showFirstVideo);
      heroVideo2.classList.toggle('opacity-100', !showFirstVideo);
    }, 8000);
  }

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

/**
 * Flexova — main.js
 * Global JavaScript: transitions, cursor, navbar, reveals, ripple, magnetic, forms
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     1. PAGE TRANSITION
  ───────────────────────────────────────────── */
  const overlay = document.getElementById('page-transition');

  window.addEventListener('load', () => {
    requestAnimationFrame(() => {
      if (overlay) overlay.classList.add('slide-out');
    });
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('mailto') ||
      href.startsWith('tel') ||
      href.startsWith('http') ||
      link.target === '_blank'
    ) return;
    e.preventDefault();
    if (overlay) {
      overlay.style.transition = 'transform 0.45s cubic-bezier(0.76, 0, 0.24, 1)';
      overlay.style.transform  = 'translateY(0)';
      overlay.classList.remove('slide-out');
    }
    setTimeout(() => { window.location.href = href; }, 420);
  });


  /* ─────────────────────────────────────────────
     2. NAVBAR — scroll shrink, hide/show, blur
  ───────────────────────────────────────────── */
  const navbar   = document.getElementById('navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;

    if (navbar) {
      if (y > 60) {
        navbar.style.background     = 'rgba(10,10,10,0.95)';
        navbar.style.backdropFilter = 'blur(16px)';
        navbar.style.borderBottom   = '1px solid rgba(255,255,255,0.06)';
        navbar.style.paddingTop     = '0.75rem';
        navbar.style.paddingBottom  = '0.75rem';
        navbar.style.boxShadow      = '0 8px 32px rgba(0,0,0,0.4)';
      } else {
        navbar.style.background     = 'transparent';
        navbar.style.backdropFilter = 'none';
        navbar.style.borderBottom   = 'none';
        navbar.style.paddingTop     = '1.25rem';
        navbar.style.paddingBottom  = '1.25rem';
        navbar.style.boxShadow      = 'none';
      }

      if (y > lastScroll + 8 && y > 200) {
        navbar.style.transform = 'translateY(-100%)';
      } else if (y < lastScroll - 4) {
        navbar.style.transform = 'translateY(0)';
      }
    }

    lastScroll = y;

    // Scroll progress bar
    const bar  = document.getElementById('scroll-progress');
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (docH > 0 ? (y / docH) * 100 : 0) + '%';
  }, { passive: true });


  /* ─────────────────────────────────────────────
     3. MOBILE MENU — animated hamburger
  ───────────────────────────────────────────── */
  const menuBtn    = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const lines      = menuBtn ? menuBtn.querySelectorAll('.hamburger-line') : [];
  let   menuOpen   = false;

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      menuOpen = !menuOpen;
      if (mobileMenu) mobileMenu.classList.toggle('open', menuOpen);
      if (lines.length === 3) {
        lines[0].style.transform = menuOpen ? 'translateY(8px) rotate(45deg)'  : '';
        lines[1].style.opacity   = menuOpen ? '0' : '1';
        lines[2].style.transform = menuOpen ? 'translateY(-8px) rotate(-45deg)' : '';
      }
    });
  }


  /* ─────────────────────────────────────────────
     4. CUSTOM CURSOR (desktop only)
  ───────────────────────────────────────────── */
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');

  if (dot && ring && window.matchMedia('(pointer: fine)').matches) {
    let mx = -200, my = -200, rx = -200, ry = -200;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
    });

    (function animRing() {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(animRing);
    })();

    const hoverTargets = 'a, button, input, textarea, select, .card-hover, label, [data-magnetic]';
    document.querySelectorAll(hoverTargets).forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    document.addEventListener('mouseleave', () => {
      dot.style.opacity  = '0';
      ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity  = '1';
      ring.style.opacity = '1';
    });
  }


  /* ─────────────────────────────────────────────
     5. SCROLL REVEAL
  ───────────────────────────────────────────── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
    revealObserver.observe(el);
  });

  // Stagger grid children
  const staggerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('staggered');
        staggerObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.stagger-children').forEach(el => staggerObserver.observe(el));


  /* ─────────────────────────────────────────────
     6. COUNT-UP NUMBERS
  ───────────────────────────────────────────── */
  function countUp(el, target, suffix, duration) {
    const isFloat = target % 1 !== 0;
    const start   = performance.now();

    (function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value    = target * ease;
      el.textContent = (isFloat ? value.toFixed(1) : Math.floor(value)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    })(start);
  }

  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      countUp(el, target, suffix, 2000);
      countObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => countObserver.observe(el));


  /* ─────────────────────────────────────────────
     7. RIPPLE EFFECT ON BUTTONS
  ───────────────────────────────────────────── */
  document.querySelectorAll('.ripple-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rect   = btn.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height) * 2;
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      ripple.style.cssText = `
        width:${size}px; height:${size}px;
        left:${e.clientX - rect.left - size / 2}px;
        top:${e.clientY  - rect.top  - size / 2}px;
      `;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    });
  });


  /* ─────────────────────────────────────────────
     8. MAGNETIC BUTTONS
  ───────────────────────────────────────────── */
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const { left, top, width, height } = el.getBoundingClientRect();
      const dx = (e.clientX - (left + width  / 2)) * 0.35;
      const dy = (e.clientY - (top  + height / 2)) * 0.35;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });


  /* ─────────────────────────────────────────────
     9. FORM SUBMIT — loading spinner + shake
  ───────────────────────────────────────────── */
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', () => {
      const btn = form.querySelector('button[type=submit]');
      if (!btn) return;
      const orig    = btn.innerHTML;
      btn.disabled  = true;
      btn.style.opacity = '0.7';
      btn.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:8px">
          <svg style="animation:flx-spin 0.8s linear infinite;width:14px;height:14px;flex-shrink:0"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10"/>
          </svg>Saving…
        </span>`;
      // Restore after 6s as safety net
      setTimeout(() => {
        btn.disabled  = false;
        btn.style.opacity = '1';
        btn.innerHTML = orig;
      }, 6000);
    });
  });

  // Shake + red border on invalid inputs
  document.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('invalid', () => {
      input.style.animation   = 'none';
      void input.offsetHeight; // force reflow
      input.style.animation   = 'flx-shake 0.4s ease';
      input.style.borderColor = '#ff4444';
    });
    input.addEventListener('input', () => {
      if (input.validity.valid) input.style.borderColor = '';
    });
  });


  /* ─────────────────────────────────────────────
     10. TOAST DISMISS
  ───────────────────────────────────────────── */
  window.dismissToast = function (el) {
    el.style.transition = 'all 0.3s ease';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(60px)';
    setTimeout(() => el.remove(), 300);
  };

  // Auto-dismiss after 4.5s
  setTimeout(() => {
    document.querySelectorAll('[id^=flash-]').forEach(el => {
      if (typeof window.dismissToast === 'function') window.dismissToast(el);
    });
  }, 4500);


  /* ─────────────────────────────────────────────
     11. PARALLAX (hero decorations)
  ───────────────────────────────────────────── */
  const parallaxEls = document.querySelectorAll('.parallax');
  if (parallaxEls.length) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.speed || 0.3);
        el.style.transform = `translateY(${y * speed}px)`;
      });
    }, { passive: true });
  }


  /* ─────────────────────────────────────────────
     12. ACTIVE NAV LINK HIGHLIGHT
  ───────────────────────────────────────────── */
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active', 'text-white');
    }
  });

})();

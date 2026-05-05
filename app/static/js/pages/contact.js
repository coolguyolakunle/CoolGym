/**
 * CoolGym — pages/contact.js
 * Contact page: live form validation, character counter, field animations
 */

(function () {
  'use strict';

  /* ── Character counter for message textarea ── */
  const textarea = document.getElementById('contact-message');
  const counter  = document.getElementById('char-counter');
  const MAX      = 1000;

  if (textarea && counter) {
    textarea.addEventListener('input', () => {
      const len      = textarea.value.length;
      const remaining = MAX - len;
      counter.textContent = `${len} / ${MAX}`;
      counter.style.color = remaining < 50 ? '#ff6b6b' : remaining < 150 ? '#fbbf24' : '#6b7280';
    });
  }

  /* ── Live email validation ── */
  const emailInput = document.getElementById('contact-email');
  const emailHint  = document.getElementById('email-hint');

  if (emailInput && emailHint) {
    emailInput.addEventListener('blur', () => {
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);
      if (emailInput.value && !valid) {
        emailHint.textContent   = '✕ Please enter a valid email';
        emailHint.style.color   = '#ff6b6b';
        emailInput.style.borderColor = '#ff6b6b';
      } else if (valid) {
        emailHint.textContent   = '✓ Looks good!';
        emailHint.style.color   = '#E8FF00';
        emailInput.style.borderColor = '#E8FF00';
      } else {
        emailHint.textContent   = '';
        emailInput.style.borderColor = '';
      }
    });
    emailInput.addEventListener('focus', () => {
      emailHint.textContent = '';
      emailInput.style.borderColor = '';
    });
  }

  /* ── Field focus glow ── */
  document.querySelectorAll('.contact-field').forEach(field => {
    const input = field.querySelector('input, textarea, select');
    const label = field.querySelector('label');
    if (!input || !label) return;

    input.addEventListener('focus', () => {
      label.style.color = '#E8FF00';
    });
    input.addEventListener('blur', () => {
      label.style.color = '';
    });
  });

})();

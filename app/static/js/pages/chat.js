/**
 * CoolGym — pages/chat.js
 * Real-time chat via polling (3s interval)
 * Works on both messages/thread.html and coach/client_detail.html (chat tab)
 */

(function () {
  'use strict';

  const chatBox    = document.getElementById('chat-box');
  const chatForm   = document.getElementById('chat-form');
  const chatInput  = document.getElementById('chat-input');
  const typingEl   = document.getElementById('typing-indicator');

  if (!chatBox || !chatForm) return;

  // Latest message timestamp for polling
  let lastTimestamp = new Date().toISOString();

  /* ── Scroll to bottom ── */
  function scrollBottom(smooth) {
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
  }
  localizeTimes();
  scrollBottom(false);

  /* ── Render a single message bubble ── */
  function renderMessage(msg) {
    const isMine = msg.is_mine;
    const wrap   = document.createElement('div');
    wrap.setAttribute('data-msg-id', msg.id);
    wrap.className = `flex ${isMine ? 'justify-end' : 'justify-start'}`;

    const avatarLetter = isMine ? '' : (window.PARTNER_INITIAL || '?');
    const avatarImage = !isMine && window.PARTNER_IMAGE_URL
      ? `<img src="${escapeAttribute(window.PARTNER_IMAGE_URL)}" alt="" class="w-7 h-7 rounded-full object-cover">`
      : avatarLetter;

    wrap.innerHTML = `
      ${!isMine ? `
        <div class="w-7 h-7 brand-bg rounded-full flex items-center justify-center text-black font-bold text-xs flex-shrink-0 mr-2 mt-1">
          ${avatarImage}
        </div>` : ''}
      <div class="max-w-xs lg:max-w-md">
        <div class="${isMine
          ? 'brand-bg text-black rounded-2xl rounded-tr-sm'
          : 'bg-dark-600 text-white border border-gray-700 rounded-2xl rounded-tl-sm'}
          px-4 py-2.5 text-sm leading-relaxed new-msg" style="animation:msg-pop 0.25s ease">
          ${escapeHtml(msg.body)}
        </div>
        <div class="text-xs text-gray-600 mt-1 ${isMine ? 'text-right' : ''}">
          ${formatLocalTime(msg.sent_at_iso)}
        </div>
      </div>
    `;

    // Remove empty-state placeholder if present
    const placeholder = chatBox.querySelector('.flex-1.flex.flex-col.items-center');
    if (placeholder) placeholder.remove();

    // Insert before typing indicator if it exists
    if (typingEl) {
      chatBox.insertBefore(wrap, typingEl);
    } else {
      chatBox.appendChild(wrap);
    }
  }

  /* ── HTML escape ── */
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function escapeAttribute(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function parseUtc(value) {
    if (!value) return null;
    const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatLocalTime(value) {
    const date = parseUtc(value);
    if (!date) return '';
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Lagos'
    });
  }

  function localizeTimes() {
    document.querySelectorAll('.js-local-time[data-utc]').forEach((el) => {
      const localTime = formatLocalTime(el.dataset.utc);
      if (localTime) el.textContent = localTime;
    });
  }

  /* ── Poll for new messages ── */
  async function poll() {
    if (typeof POLL_URL === 'undefined') return;
    try {
      const res  = await fetch(`${POLL_URL}?since=${encodeURIComponent(lastTimestamp)}`);
      const msgs = await res.json();
      if (msgs.length > 0) {
        msgs.forEach(msg => {
          // Skip if already in DOM
          if (chatBox.querySelector(`[data-msg-id="${msg.id}"]`)) return;
          renderMessage(msg);
          lastTimestamp = msg.sent_at_iso || new Date().toISOString();
        });
        scrollBottom(true);
        // Update badge in nav if messages received
        const badge = document.querySelector('#unread-badge');
        if (badge) badge.textContent = '';
      }
    } catch (e) {
      // Silently fail — polling will retry
    }
  }

  // Start polling every 3 seconds
  setInterval(poll, 3000);

  /* ── AJAX form submit (no page reload) ── */
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = chatInput.value.trim();
    if (!body) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Send to server
    try {
      const fd = new FormData(chatForm);
      fd.set('body', body);
      await fetch(chatForm.action, {
        method: 'POST',
        body: new URLSearchParams(fd),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        redirect: 'manual',
      });
      lastTimestamp = new Date(Date.now() - 2000).toISOString();
      setTimeout(poll, 200);
    } catch (err) {
      console.error('Send failed:', err);
    }
  });

  /* ── Textarea auto-resize + Enter to send ── */
  window.handleEnter = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  if (chatInput) {
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
    // Focus on load
    chatInput.focus();
  }

  /* ── Inject CSS for message pop animation ── */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes msg-pop {
      from { opacity:0; transform:scale(0.9) translateY(6px); }
      to   { opacity:1; transform:scale(1)   translateY(0);   }
    }
    .brand-bg { background-color: #E8FF00; }
    .brand-text { color: #E8FF00; }
  `;
  document.head.appendChild(style);

  // Expose partner initial for renderMessage (set by inline script in templates)
  if (typeof PARTNER_ID !== 'undefined') {
    if (typeof PARTNER_INITIAL !== 'undefined') {
      window.PARTNER_INITIAL = PARTNER_INITIAL;
    }
    if (typeof PARTNER_IMAGE_URL !== 'undefined') {
      window.PARTNER_IMAGE_URL = PARTNER_IMAGE_URL;
    }

    // Try to read from the existing avatar in DOM
    const firstAvatar = chatBox.querySelector('.brand-bg');
    if (firstAvatar && firstAvatar.tagName === 'DIV' && firstAvatar.classList.contains('rounded-full')) {
      window.PARTNER_INITIAL = firstAvatar.textContent.trim()[0] || '?';
    }
  }

})();

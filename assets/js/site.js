// A.R.C. Disco — static site helper
(function () {
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var closeNav = function () {
    if (!nav || !burger) return;
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
  };
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        closeNav();
        burger.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('open')) return;
      if (!nav.contains(e.target) && !burger.contains(e.target)) closeNav();
    });
    var wide = window.matchMedia('(min-width: 1081px)');
    var onWide = function (e) { if (e.matches) closeNav(); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  // Lightbox
  var dialog = document.getElementById('lightbox');
  if (dialog && typeof dialog.showModal === 'function') {
    var img = dialog.querySelector('img');
    var counter = dialog.querySelector('.lb-count');
    var shots = Array.prototype.slice.call(document.querySelectorAll('.gallery button'));
    var current = 0;
    var seq = 0;
    var lastFocus = null;

    var preloadFull = function (src) {
      var token = ++seq;
      var pre = new Image();
      pre.onload = function () {
        if (token === seq) img.src = src;
      };
      pre.src = src;
    };

    var show = function (i, openDialog) {
      if (!shots.length) return;
      current = (i + shots.length) % shots.length;
      var btn = shots[current];
      var thumb = btn.querySelector('img');
      var full = btn.getAttribute('data-full');
      var placeholder = thumb ? thumb.getAttribute('src') : full;
      // Put the already-cached thumbnail in place first, so the previous
      // photograph never flashes while the full-size copy loads.
      img.src = placeholder;
      img.alt = thumb ? thumb.alt : '';
      if (counter) counter.textContent = (current + 1) + ' / ' + shots.length;
      if (full && full !== placeholder) preloadFull(full);
      if (openDialog && !dialog.open) {
        dialog.showModal();
        var close = dialog.querySelector('[data-close]');
        if (close) close.focus();
      }
    };

    shots.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        lastFocus = btn;
        show(i, true);
      });
    });

    dialog.addEventListener('click', function (e) {
      if (e.target.closest('[data-prev]')) { show(current - 1); return; }
      if (e.target.closest('[data-next]')) { show(current + 1); return; }
      if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
    });

    var startX = 0, startY = 0, startT = 0, tracking = false;
    dialog.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      tracking = true;
      startX = e.clientX;
      startY = e.clientY;
      startT = Date.now();
    });
    dialog.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Date.now() - startT < 700 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        show(current + (dx < 0 ? 1 : -1));
      }
    });
    dialog.addEventListener('pointercancel', function () { tracking = false; });

    dialog.addEventListener('close', function () {
      if (lastFocus) lastFocus.focus();
    });

    document.addEventListener('keydown', function (e) {
      if (!dialog.open) return;
      if (e.key === 'Escape') dialog.close();
      else if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'ArrowLeft') show(current - 1);
    });
  }

  // Enquiry form → mailto (swap for a form endpoint when hosted)
  var form = document.getElementById('enquiry');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var lines = [];
      d.forEach(function (v, k) {
        if (String(v).trim()) lines.push(k + ': ' + v);
      });
      var subject = 'Website enquiry — ' + (d.get('Function type') || 'event') + ' ' + (d.get('Date') || '');
      var href = 'mailto:info@arcdisco.co.uk?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      window.location.href = href;
      var note = document.getElementById('form-status');
      if (note) note.textContent = 'Opening your email app with the enquiry details…';
    });
  }

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

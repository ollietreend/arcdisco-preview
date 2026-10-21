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
    var stage = dialog.querySelector('.lb-stage');
    var counter = dialog.querySelector('.lb-count');
    var shots = Array.prototype.slice.call(document.querySelectorAll('.gallery button'));
    var current = 0;
    var seq = 0;
    var lastFocus = null;
    var busy = false;

    var preloadFull = function (src) {
      var token = ++seq;
      var pre = new Image();
      pre.onload = function () {
        if (token === seq) img.src = src;
      };
      pre.src = src;
    };

    var paint = function (i) {
      current = (i + shots.length) % shots.length;
      var btn = shots[current];
      var thumb = btn.querySelector('img');
      var full = btn.getAttribute('data-full');
      var placeholder = thumb ? thumb.getAttribute('src') : full;
      img.src = placeholder;
      img.alt = thumb ? thumb.alt : '';
      if (counter) counter.textContent = (current + 1) + ' / ' + shots.length;
      if (full && full !== placeholder) preloadFull(full);
    };

    var slide = function (i, dir, fromPx) {
      if (busy) return;
      busy = true;
      var from = (fromPx || 0) + 'px';
      var opacity = fromPx ? Math.max(0.4, 1 - Math.abs(fromPx) / 600) : 1;
      img.style.transform = '';
      var out = img.animate([
        { transform: 'translate3d(' + from + ',0,0)', opacity: opacity },
        { transform: 'translate3d(' + (dir > 0 ? -100 : 100) + '%,0,0)', opacity: 0.2 }
      ], { duration: fromPx ? 150 : 190, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
      var swapped = false;
      var finishOut = function () {
        if (swapped) return;
        swapped = true;
        paint(i);
        out.cancel();
        var fromIn = (dir > 0 ? 100 : -100) + '%';
        var inAnim = img.animate([
          { transform: 'translate3d(' + fromIn + ',0,0)', opacity: 0.2 },
          { transform: 'translate3d(0,0,0)', opacity: 1 }
        ], { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' });
        var settled = false;
        var endIn = function () { if (settled) return; settled = true; busy = false; };
        inAnim.onfinish = endIn;
        inAnim.oncancel = endIn;
        setTimeout(endIn, 330);
      };
      out.onfinish = finishOut;
      setTimeout(finishOut, fromPx ? 200 : 240);
    };

    var settle = function (dx) {
      img.style.transform = '';
      var back = img.animate([
        { transform: 'translate3d(' + dx + 'px,0,0)', opacity: Math.max(0.5, 1 - Math.abs(dx) / 700) },
        { transform: 'translate3d(0,0,0)', opacity: 1 }
      ], { duration: 200, easing: 'cubic-bezier(.2,.7,.2,1)' });
      var settled = false;
      var done = function () { if (settled) return; settled = true; busy = false; };
      back.onfinish = done;
      setTimeout(done, 260);
    };

    var show = function (i) {
      busy = false;
      paint(i);
      if (!dialog.open) {
        dialog.showModal();
        var close = dialog.querySelector('[data-close]');
        if (close) close.focus();
      }
    };

    shots.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        lastFocus = btn;
        show(i);
      });
    });

    dialog.addEventListener('click', function (e) {
      if (e.target.closest('[data-prev]')) { slide(current - 1, -1); return; }
      if (e.target.closest('[data-next]')) { slide(current + 1, 1); return; }
      if (e.target.closest('[data-close]')) { dialog.close(); return; }
      if (e.target === dialog || e.target === stage) dialog.close();
    });

    var startX = 0, startY = 0, dragging = false, horiz = false;
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button') || busy) return;
      dragging = true;
      horiz = false;
      startX = e.clientX;
      startY = e.clientY;
      img.style.transform = 'translate3d(0,0,0)';
      if (stage.setPointerCapture) { try { stage.setPointerCapture(e.pointerId); } catch (err) {} }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!horiz && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) horiz = true;
      if (!horiz) return;
      img.style.transform = 'translate3d(' + dx + 'px,0,0)';
      img.style.opacity = String(Math.max(0.45, 1 - Math.abs(dx) / 600));
    });
    var endDrag = function (e) {
      if (!dragging) return;
      dragging = false;
      var dx = e.clientX - startX;
      if (horiz && Math.abs(dx) > 60) {
        slide(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1, dx);
      } else {
        settle(dx);
      }
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', function () {
      dragging = false;
      settle(0);
    });

    dialog.addEventListener('close', function () {
      busy = false;
      img.style.transform = '';
      img.style.opacity = '';
      if (lastFocus) lastFocus.focus();
    });

    document.addEventListener('keydown', function (e) {
      if (!dialog.open) return;
      if (e.key === 'Escape') dialog.close();
      else if (e.key === 'ArrowRight') slide(current + 1, 1);
      else if (e.key === 'ArrowLeft') slide(current - 1, -1);
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

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

  // Lightbox — two image layers so the next photo is visible while dragging
  var dialog = document.getElementById('lightbox');
  if (dialog && typeof dialog.showModal === 'function') {
    var stage = dialog.querySelector('.lb-stage');
    var track = dialog.querySelector('.lb-track');
    var imgs = Array.prototype.slice.call(dialog.querySelectorAll('.lb-stage img'));
    var counter = dialog.querySelector('.lb-count');
    var shots = Array.prototype.slice.call(document.querySelectorAll('.gallery button'));
    var current = 0;
    var front = 0;
    var busy = false;
    var drag = null;
    var seq = 0;
    var lastFocus = null;

    var mod = function (n) { return (n + shots.length) % shots.length; };
    var stageWidth = function () { return stage.clientWidth || window.innerWidth; };

    var shot = function (i) {
      var btn = shots[i];
      var thumb = btn.querySelector('img');
      return {
        thumb: thumb ? thumb.getAttribute('src') : btn.getAttribute('data-full'),
        full: btn.getAttribute('data-full'),
        alt: thumb ? thumb.alt : ''
      };
    };

    var fill = function (slot, i, offsetPx) {
      var s = shot(mod(i));
      var el = imgs[slot];
      el.dataset.index = String(mod(i));
      el.src = s.thumb;
      el.alt = s.alt;
      el.style.setProperty('--x', offsetPx + 'px');
    };

    var upgrade = function (i) {
      var s = shot(mod(i));
      var token = ++seq;
      var pre = new Image();
      pre.onload = function () {
        if (token !== seq) return;
        if (imgs[front].dataset.index === String(mod(i))) imgs[front].src = pre.src;
      };
      pre.src = s.full;
    };

    var parkNeighbour = function (dir) {
      fill(1 - front, current + dir, dir * stageWidth());
    };

    var setTrack = function (px) {
      track.style.transform = 'translate3d(' + px + 'px,0,0)';
    };

    var setCounter = function () {
      if (counter) counter.textContent = (current + 1) + ' / ' + shots.length;
    };

    var openAt = function (i) {
      current = mod(i);
      front = 0;
      busy = false;
      fill(0, current, 0);
      fill(1, current + 1, stageWidth());
      setTrack(0);
      setCounter();
      resetZoom();
      upgrade(current);
      if (!dialog.open) {
        dialog.showModal();
        var close = dialog.querySelector('[data-close]');
        if (close) close.focus();
      }
    };

    var commit = function (dir, fromPx) {
      if (busy) return;
      busy = true;
      resetZoom();
      var w = stageWidth();
      fill(1 - front, current + dir, dir * w);
      var start = typeof fromPx === 'number' ? fromPx : 0;
      var target = -dir * w;
      var duration = typeof fromPx === 'number' ? 200 : 280;
      var anim = track.animate([
        { transform: 'translate3d(' + start + 'px,0,0)' },
        { transform: 'translate3d(' + target + 'px,0,0)' }
      ], { duration: duration, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' });
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        anim.cancel();
        current = mod(current + dir);
        front = 1 - front;
        imgs[front].style.setProperty('--x', '0px');
        setTrack(0);
        parkNeighbour(dir);
        setCounter();
        upgrade(current);
        busy = false;
      };
      anim.onfinish = finish;
      setTimeout(finish, duration + 60);
    };

    var snapBack = function (fromPx) {
      busy = true;
      var anim = track.animate([
        { transform: 'translate3d(' + fromPx + 'px,0,0)' },
        { transform: 'translate3d(0,0,0)' }
      ], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        anim.cancel();
        setTrack(0);
        busy = false;
      };
      anim.onfinish = finish;
      setTimeout(finish, 280);
    };

    shots.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        lastFocus = btn;
        openAt(i);
      });
    });

    dialog.addEventListener('click', function (e) {
      if (e.target.closest('[data-prev]')) { commit(-1); return; }
      if (e.target.closest('[data-next]')) { commit(1); return; }
      if (e.target.closest('[data-close]')) dialog.close();
    });

    var zoomEl = dialog.querySelector('.lb-zoom');
    var z = 1, panX = 0, panY = 0;
    var pointers = new Map();
    var pinch = null;
    var lastTap = 0;
    var tapX = 0, tapY = 0;

    var applyZoom = function (animate) {
      if (animate) zoomEl.classList.add('animating');
      else zoomEl.classList.remove('animating');
      zoomEl.style.transform = 'translate3d(' + panX + 'px,' + panY + 'px,0) scale(' + z + ')';
    };
    var stageHeight = function () { return stage.clientHeight || window.innerHeight; };
    var clampPan = function () {
      var w = stageWidth(), h = stageHeight();
      var mx = Math.max(0, (w * (z - 1)) / 2 + 24);
      var my = Math.max(0, (h * (z - 1)) / 2 + 24);
      panX = Math.max(-mx, Math.min(mx, panX));
      panY = Math.max(-my, Math.min(my, panY));
    };
    var resetZoom = function () {
      z = 1; panX = 0; panY = 0;
      applyZoom(false);
    };
    var toggleZoom = function (cx, cy) {
      if (z > 1.01) {
        z = 1; panX = 0; panY = 0;
      } else {
        z = 2.5;
        panX = (stageWidth() / 2 - cx) * (z - 1);
        panY = (stageHeight() / 2 - cy) * (z - 1);
        clampPan();
      }
      applyZoom(true);
    };

    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button') || busy || !dialog.open) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        drag = null;
        var pts = Array.prototype.slice.call(pointers.values());
        pinch = {
          d0: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
          z0: z,
          mx: (pts[0].x + pts[1].x) / 2,
          my: (pts[0].y + pts[1].y) / 2,
          px: panX,
          py: panY
        };
        return;
      }
      drag = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, dir: 0 };
      if (stage.setPointerCapture) { try { stage.setPointerCapture(e.pointerId); } catch (err) {} }
    });

    stage.addEventListener('pointermove', function (e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size >= 2) {
        var pts = Array.prototype.slice.call(pointers.values());
        var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        var midX = (pts[0].x + pts[1].x) / 2;
        var midY = (pts[0].y + pts[1].y) / 2;
        z = Math.max(1, Math.min(4, pinch.z0 * (d / pinch.d0)));
        panX = pinch.px + (midX - pinch.mx);
        panY = pinch.py + (midY - pinch.my);
        clampPan();
        applyZoom(false);
        return;
      }
      if (!drag) return;
      if (z > 1.01) {
        panX += e.clientX - drag.lastX;
        panY += e.clientY - drag.lastY;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        clampPan();
        applyZoom(false);
        return;
      }
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      if (!drag.dir) {
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
        drag.dir = dx < 0 ? 1 : -1;
        parkNeighbour(drag.dir);
      }
      setTrack(dx);
    });

    var endDrag = function (e) {
      pointers.delete(e.pointerId);
      if (pinch) {
        if (pointers.size < 2) {
          pinch = null;
          if (z < 1.06) { z = 1; panX = 0; panY = 0; }
          clampPan();
          applyZoom(true);
          drag = null;
        }
        return;
      }
      if (!drag) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      var moved = Math.hypot(dx, dy);
      var now = Date.now();
      if (moved < 12) {
        if (now - lastTap < 320 && Math.hypot(e.clientX - tapX, e.clientY - tapY) < 44) {
          lastTap = 0;
          toggleZoom(e.clientX, e.clientY);
          drag = null;
          return;
        }
        lastTap = now;
        tapX = e.clientX;
        tapY = e.clientY;
      }
      if (z > 1.01) { drag = null; return; }
      var dir = drag.dir;
      drag = null;
      if (!dir) return;
      if (Math.abs(dx) > stageWidth() * 0.18) commit(dir, dx);
      else snapBack(dx);
    };
    var touchPinch = null;
    stage.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      var a = e.touches[0], b = e.touches[1];
      touchPinch = {
        d0: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
        z0: z
      };
      drag = null;
      pinch = null;
    }, { passive: false });
    stage.addEventListener('touchmove', function (e) {
      if (!touchPinch || e.touches.length < 2) return;
      e.preventDefault();
      var a = e.touches[0], b = e.touches[1];
      var d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
      z = Math.max(1, Math.min(4, touchPinch.z0 * (d / touchPinch.d0)));
      clampPan();
      applyZoom(false);
    }, { passive: false });
    stage.addEventListener('touchend', function (e) {
      if (!touchPinch || e.touches.length >= 2) return;
      touchPinch = null;
      if (z < 1.06) { z = 1; panX = 0; panY = 0; }
      clampPan();
      applyZoom(true);
    });
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', function (e) {
      pointers.delete(e.pointerId);
      if (pinch && pointers.size < 2) {
        pinch = null;
        clampPan();
        applyZoom(true);
      }
      drag = null;
    });

    dialog.addEventListener('close', function () {
      busy = false;
      drag = null;
      setTrack(0);
      resetZoom();
      if (lastFocus) lastFocus.focus();
    });

    document.addEventListener('keydown', function (e) {
      if (!dialog.open) return;
      if (e.key === 'Escape') dialog.close();
      else if (e.key === 'ArrowRight') commit(1);
      else if (e.key === 'ArrowLeft') commit(-1);
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

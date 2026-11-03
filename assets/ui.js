// Tech Kadak UI: light/dark toggle, fade-up on scroll, installable app (service worker + install hint).
(function () {
  var doc = document.documentElement;
  // ----- theme -----
  function setMeta(t) { var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'light' ? '#EEF2E8' : '#060806'); }
  setMeta(doc.dataset.theme);
  var tb = document.getElementById('themeBtn');
  if (tb) tb.addEventListener('click', function () {
    var t = doc.dataset.theme === 'light' ? 'dark' : 'light';
    doc.dataset.theme = t; setMeta(t);
    try { localStorage.setItem('tk-theme', t); } catch (e) {}
  });

  // ----- fade-up on scroll -----
  var items = document.querySelectorAll('.reveal');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduce) { items.forEach(function (el) { el.classList.add('in'); }); }
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  }

  // ----- service worker (offline shell; new apps always fetched fresh) -----
  var man = document.querySelector('link[rel="manifest"]');
  if ('serviceWorker' in navigator && man && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register(new URL('sw.js', man.href).href).catch(function () {}); });
  }

  // ----- install hint -----
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var toast = document.getElementById('installToast'), btn = document.getElementById('installBtn'), x = document.getElementById('installX'), msg = document.getElementById('installMsg');
  var deferred = null, KEY = 'tk-install-dismissed';
  function dismissedRecently() { try { var t = +localStorage.getItem(KEY); return t && Date.now() - t < 14 * 864e5; } catch (e) { return false; } }
  function iosHelp() { if (msg) msg.innerHTML = 'Safari mein neeche <b>Share ⬆︎</b> dabao → <b>"Add to Home Screen"</b>.'; if (btn) btn.hidden = true; }
  function show() { if (!toast || standalone) return; toast.hidden = false; requestAnimationFrame(function () { requestAnimationFrame(function () { toast.classList.add('show'); }); }); }
  function hide(remember) { if (!toast) return; toast.classList.remove('show'); setTimeout(function () { toast.hidden = true; }, 600); if (remember) try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    if (!dismissedRecently()) setTimeout(show, 3500);
  });
  window.addEventListener('appinstalled', function () { hide(true); });
  function install() {
    if (deferred) { deferred.prompt(); deferred.userChoice.then(function () { deferred = null; hide(true); }); return; }
    if (isIOS) { iosHelp(); show(); return; }
    if (msg) msg.textContent = 'Browser menu ⋮ → "Install app" ya "Add to Home screen" dabao.'; if (btn) btn.hidden = true; show();
  }
  if (btn) btn.addEventListener('click', install);
  if (x) x.addEventListener('click', function () { hide(true); });
  document.querySelectorAll('[data-install]').forEach(function (b) {
    if (standalone) { var card = b.closest('.pwa-card'); if (card) card.hidden = true; return; }
    b.addEventListener('click', install);
  });
  // iPhone Safari never fires beforeinstallprompt: show the how-to once in a while.
  if (isIOS && !standalone && !dismissedRecently() && !/CriOS|FxiOS|EdgiOS/.test(ua)) { iosHelp(); setTimeout(show, 4000); }
})();

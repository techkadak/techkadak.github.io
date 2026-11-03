// Apps list: search + category + pricing filter on the pre-rendered cards (no data fetch).
// URL params kept working: ?q=, ?cat=<slug>, ?kit=slug1,slug2,slug3
(function () {
  var q = document.getElementById('q'), grid = document.getElementById('grid'), count = document.getElementById('count'), empty = document.getElementById('empty');
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.app-card'));
  var cat = '', price = '', kit = null;
  var params = new URLSearchParams(location.search);
  var slugMap = {}; document.querySelectorAll('#chips .chip').forEach(function (c) { if (c.dataset.slug) slugMap[c.dataset.slug] = c.dataset.cat; });
  if (params.get('q')) q.value = params.get('q');
  if (params.get('cat') && slugMap[params.get('cat')]) cat = slugMap[params.get('cat')];
  if (params.get('kit')) kit = params.get('kit').split(',');
  cards.forEach(function (c) { c._slug = c.querySelector('.card-name a').getAttribute('href').split('/').pop().replace('.html', ''); });
  function on(group, attr, val) { document.querySelectorAll(group + ' .chip').forEach(function (c) { var y = (c.dataset[attr] || '') === val; c.classList.toggle('on', y); c.setAttribute('aria-pressed', y ? 'true' : 'false'); }); }
  function apply() {
    var term = q.value.trim().toLowerCase(), n = 0;
    cards.forEach(function (c) {
      var ok = (!term || c.dataset.search.indexOf(term) > -1) && (!cat || c.dataset.cats.split('|').indexOf(cat) > -1) && (!price || c.dataset.pricing === price) && (!kit || kit.indexOf(c._slug) > -1);
      c.hidden = !ok; if (ok) { n++; c.classList.add('in'); }
    });
    count.textContent = (kit ? 'Tumhara kit: ' : '') + n + ' apps'; empty.hidden = n > 0;
    var u = new URL(location.href); term ? u.searchParams.set('q', term) : u.searchParams.delete('q');
    var cs = Object.keys(slugMap).find(function (k) { return slugMap[k] === cat; }); cs ? u.searchParams.set('cat', cs) : u.searchParams.delete('cat');
    history.replaceState(null, '', u);
  }
  on('#chips', 'cat', cat); on('#pchips', 'p', price);
  document.getElementById('chips').addEventListener('click', function (e) { var c = e.target.closest('.chip'); if (!c) return; cat = c.dataset.cat || ''; kit = null; on('#chips', 'cat', cat); apply(); c.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); });
  document.getElementById('pchips').addEventListener('click', function (e) { var c = e.target.closest('.chip'); if (!c) return; price = c.dataset.p || ''; on('#pchips', 'p', price); apply(); });
  q.addEventListener('input', function () { kit = null; apply(); });
  q.addEventListener('keydown', function (e) { if (e.key === 'Enter') q.blur(); });
  apply();
})();

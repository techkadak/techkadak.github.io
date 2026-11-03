// Apps list: search + category + pricing filter (works on the pre-rendered cards; no data fetch).
(function () {
  var q = document.getElementById('q'), grid = document.getElementById('grid'), count = document.getElementById('count'), empty = document.getElementById('empty');
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.app-card'));
  var cat = '', price = '', kit = null;
  var params = new URLSearchParams(location.search);
  var slugMap = {}; document.querySelectorAll('#chips .chip').forEach(function (c) { if (c.dataset.slug) slugMap[c.dataset.slug] = c.dataset.cat; });
  if (params.get('q')) q.value = params.get('q');
  if (params.get('cat') && slugMap[params.get('cat')]) cat = slugMap[params.get('cat')];
  if (params.get('kit')) kit = params.get('kit').split(',');
  function on(group, attr, val) { document.querySelectorAll(group + ' .chip').forEach(function (c) { c.classList.toggle('on', (c.dataset[attr] || '') === val); }); }
  function apply() {
    var term = q.value.trim().toLowerCase(), n = 0;
    cards.forEach(function (c) {
      var slug = c.querySelector('.card-name a').getAttribute('href').split('/').pop().replace('.html', '');
      var ok = (!term || c.dataset.search.indexOf(term) > -1) && (!cat || c.dataset.cats.split('|').indexOf(cat) > -1) && (!price || c.dataset.pricing === price) && (!kit || kit.indexOf(slug) > -1);
      c.hidden = !ok; if (ok) n++;
    });
    count.textContent = (kit ? 'Tumhara kit: ' : '') + n + ' apps'; empty.hidden = n > 0;
    var u = new URL(location.href); term ? u.searchParams.set('q', term) : u.searchParams.delete('q');
    var cs = Object.keys(slugMap).find(function (k) { return slugMap[k] === cat; }); cs ? u.searchParams.set('cat', cs) : u.searchParams.delete('cat');
    history.replaceState(null, '', u);
  }
  on('#chips', 'cat', cat);
  document.getElementById('chips').addEventListener('click', function (e) { var c = e.target.closest('.chip'); if (!c) return; cat = c.dataset.cat || ''; kit = null; on('#chips', 'cat', cat); apply(); });
  document.getElementById('pchips').addEventListener('click', function (e) { var c = e.target.closest('.chip'); if (!c) return; price = c.dataset.p || ''; on('#pchips', 'p', price); apply(); });
  q.addEventListener('input', function () { kit = null; apply(); });
  apply();
})();

/**
 * AG&W Field Manual — navigation and search.
 *
 * Search indexes every page linked from the sidebar. Each page's h2/h3
 * headings with an id and every .fm-entry[id] become a result. Pages are
 * fetched the first time the search box is used, so adding a page or entry
 * needs no separate index file. Optional data-keywords="..." on an entry or
 * heading adds extra search terms.
 */
(function () {
  var sidebar = document.querySelector('.fm-sidebar');
  var menuBtn = document.querySelector('.fm-menu-btn');
  var input = document.getElementById('fm-search-input');
  var results = document.getElementById('fm-search-results');
  var status = document.getElementById('fm-search-status');

  function say(text) { if (status) status.textContent = text; }

  /* --- Mobile contents toggle --- */
  function setMenu(open) {
    sidebar.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setMenu(!sidebar.classList.contains('open'));
    });
    // Close after choosing a link, or when tapping outside the menu
    document.addEventListener('click', function (e) {
      if (!sidebar.classList.contains('open')) return;
      if (e.target.closest('.fm-nav a') || !e.target.closest('.fm-nav')) setMenu(false);
    });
  }

  /* --- On-page section list under the current nav item --- */
  var current = document.querySelector('.fm-nav a[aria-current="page"]');
  var sections = document.querySelectorAll('.fm-content h2[id]');
  if (current && sections.length > 1) {
    var sub = document.createElement('ol');
    sections.forEach(function (h) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.replace(/\s*#$/, '');
      li.appendChild(a);
      sub.appendChild(li);
    });
    current.parentNode.appendChild(sub);
  }

  if (!input || !results) return;

  /* --- Search index --- */
  var index = null;
  var loading = null;

  function pageUrls() {
    var seen = {};
    var urls = [];
    document.querySelectorAll('.fm-nav > ol > li > a').forEach(function (a) {
      var url = a.getAttribute('href').split('#')[0];
      if (!seen[url]) { seen[url] = true; urls.push(url); }
    });
    return urls;
  }

  function clean(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  // textContent runs block elements together ("15%Upgraded"); add a space
  // at each block boundary. innerText isn't available on fetched pages.
  var BLOCK = /^(P|LI|DT|DD|DIV|H[1-6]|TD|TH|TR|BLOCKQUOTE|CITE|UL|OL|DL|TABLE|ARTICLE|SECTION)$/;
  function textOf(node) {
    var out = '';
    node.childNodes.forEach(function (child) {
      if (child.nodeType === 3) out += child.nodeValue;
      else if (child.nodeType === 1) {
        var block = BLOCK.test(child.tagName);
        out += (block ? ' ' : '') + textOf(child) + (block ? ' ' : '');
      }
    });
    return out;
  }

  function collect(doc, url) {
    var pageTitle = clean((doc.querySelector('.fm-content h1') || {}).textContent);
    var items = [];
    doc.querySelectorAll('.fm-content [id]').forEach(function (el) {
      var isEntry = el.classList.contains('fm-entry');
      var isHeading = /^H[23]$/.test(el.tagName);
      var isTerm = el.tagName === 'DT';
      if (!isEntry && !isHeading && !isTerm) return;
      // Headings inside an entry are covered by the entry itself
      if (isHeading && el.closest('.fm-entry')) return;

      var heading = isEntry ? el.querySelector('h2, h3') : el;
      var title = clean(heading ? heading.textContent : el.id);
      var body;
      if (isEntry) {
        body = clean(textOf(el));
      } else if (isTerm) {
        body = clean(el.nextElementSibling ? textOf(el.nextElementSibling) : '');
      } else {
        // A heading's body is the text up to the next heading
        var parts = [];
        var sib = el.nextElementSibling;
        while (sib && !/^H[123]$/.test(sib.tagName)) {
          // Entry cards are indexed on their own
          if (!sib.classList.contains('fm-entries')) parts.push(textOf(sib));
          sib = sib.nextElementSibling;
        }
        body = clean(parts.join(' '));
      }
      items.push({
        url: url + '#' + el.id,
        page: pageTitle,
        title: title,
        keywords: (el.getAttribute('data-keywords') || '').toLowerCase(),
        body: body,
        titleLc: title.toLowerCase(),
        bodyLc: body.toLowerCase()
      });
    });
    return items;
  }

  function here() {
    var path = location.pathname.split('/').pop();
    return path === '' ? 'index.html' : path;
  }

  function buildIndex() {
    if (loading) return loading;
    var parser = new DOMParser();
    var currentUrl = here();
    loading = Promise.all(pageUrls().map(function (url) {
      if (url === currentUrl) return Promise.resolve(collect(document, url));
      return fetch(url)
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (html) { return html ? collect(parser.parseFromString(html, 'text/html'), url) : []; })
        .catch(function () { return []; });
    })).then(function (lists) {
      index = [].concat.apply([], lists);
      return index;
    });
    return loading;
  }

  function score(item, terms) {
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      var s = 0;
      if (item.titleLc === t) s = 100;
      else if (item.titleLc.indexOf(t) === 0) s = 60;
      else if (item.titleLc.indexOf(t) !== -1) s = 40;
      else if (item.keywords.indexOf(t) !== -1) s = 30;
      else if (item.bodyLc.indexOf(t) !== -1) s = 10;
      if (s === 0) return 0; // every term must match somewhere
      total += s;
    }
    return total;
  }

  function snippet(item, term) {
    var i = item.bodyLc.indexOf(term);
    if (i === -1 || item.titleLc.indexOf(term) !== -1) return item.page;
    var start = Math.max(0, i - 30);
    var text = item.body.slice(start, i + 60);
    return (start > 0 ? '…' : '') + text + '…';
  }

  var active = -1;

  function render(query) {
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    results.innerHTML = '';
    active = -1;
    if (!terms.length) { results.hidden = true; say(''); return; }

    var matches = index
      .map(function (item) { return { item: item, s: score(item, terms) }; })
      .filter(function (m) { return m.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 12);

    if (!matches.length) {
      var none = document.createElement('li');
      none.className = 'fm-noresult';
      none.textContent = 'No entries found. Try another word.';
      results.appendChild(none);
      say('No entries found.');
    } else {
      say(matches.length + (matches.length === 1 ? ' result' : ' results') + '. Press the down arrow to browse them.');
    }

    matches.forEach(function (m) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = m.item.url;
      a.textContent = m.item.title;
      var small = document.createElement('small');
      small.textContent = snippet(m.item, terms[0]);
      a.appendChild(small);
      a.addEventListener('click', function () { results.hidden = true; });
      li.appendChild(a);
      results.appendChild(li);
    });
    results.hidden = false;
  }

  // Arrow keys move real focus through the results, so screen readers follow
  function setActive(n) {
    var links = results.querySelectorAll('a');
    if (!links.length) return;
    active = (n + links.length) % links.length;
    links.forEach(function (a, i) { a.classList.toggle('active', i === active); });
    links[active].focus();
  }

  results.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (active <= 0) { active = -1; input.focus(); } else setActive(active - 1);
    } else if (e.key === 'Escape') { results.hidden = true; input.focus(); }
  });

  input.addEventListener('focus', buildIndex);

  input.addEventListener('input', function () {
    var q = input.value;
    buildIndex().then(function () { if (input.value === q) render(q); });
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') {
      var links = results.querySelectorAll('a');
      var target = links[active] || links[0];
      if (target) { results.hidden = true; location.href = target.href; }
    } else if (e.key === 'Escape') {
      input.value = '';
      results.hidden = true;
      input.blur();
    }
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.fm-search')) results.hidden = true;
  });

  window.addEventListener('hashchange', function () { results.hidden = true; });

  // "/" jumps to search, as on most documentation sites
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== input &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      input.focus();
    }
  });
})();

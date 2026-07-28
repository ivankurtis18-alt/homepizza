(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var navWrap = document.getElementById('menuNavWrap');
  var navButtons = Array.prototype.slice.call(document.querySelectorAll('.nav-pill'));
  var categories = Array.prototype.slice.call(document.querySelectorAll('.menu-category'));
  var searchInput = document.getElementById('menuSearch');
  var emptyMsg = document.getElementById('menuEmpty');
  var toTopBtn = document.getElementById('toTopBtn');

  var DEFAULT_CATEGORY = 'pice';
  var activeCategory = DEFAULT_CATEGORY;

  /* ---- keep sticky offsets in sync with real header height ---- */
  function syncHeaderHeight() {
    var h = header ? header.offsetHeight : 0;
    document.documentElement.style.setProperty('--header-h', h + 'px');
    navWrap.style.top = h + 'px';
    var navH = navWrap.offsetHeight;
    categories.forEach(function (cat) {
      cat.style.scrollMarginTop = (h + navH + 24) + 'px';
    });
  }
  window.addEventListener('resize', syncHeaderHeight);
  syncHeaderHeight();

  /* ---- item counts per category ---- */
  categories.forEach(function (cat) {
    var count = cat.querySelectorAll('.menu-item').length;
    var countEl = cat.querySelector('.cat-count');
    if (countEl) countEl.textContent = count + ' stavki';
  });

  /* ---- tab-style category switching ---- */
  function setActiveCategory(id) {
    activeCategory = id;

    /* clear any leftover per-item hidden state from a previous search */
    categories.forEach(function (cat) {
      Array.prototype.slice.call(cat.querySelectorAll('.menu-item')).forEach(function (item) {
        item.hidden = false;
      });
      cat.hidden = cat.dataset.id !== id;
    });

    navButtons.forEach(function (btn) {
      var isActive = btn.dataset.target === id;
      btn.classList.toggle('is-active', isActive);
      btn.classList.remove('is-dim');
      var badge = btn.querySelector('.nav-badge');
      if (badge) badge.textContent = '';
    });

    emptyMsg.hidden = true;
  }

  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      searchInput.value = '';
      setActiveCategory(btn.dataset.target);
      document.getElementById('meni').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---- search / filter ---- */
  function normalize(str) {
    return str.toLowerCase();
  }

  function runSearch(query) {
    var q = normalize(query.trim());

    if (!q) {
      setActiveCategory(activeCategory);
      return;
    }

    var anyVisible = false;

    categories.forEach(function (cat) {
      var items = Array.prototype.slice.call(cat.querySelectorAll('.menu-item'));
      var matchCount = 0;

      items.forEach(function (item) {
        var haystack = item.dataset.search || '';
        var match = haystack.indexOf(q) !== -1;
        item.hidden = !match;
        if (match) matchCount++;
      });

      cat.hidden = matchCount === 0;
      if (matchCount > 0) anyVisible = true;

      var navBtn = navButtons.filter(function (b) { return b.dataset.target === cat.dataset.id; })[0];
      if (navBtn) {
        var badge = navBtn.querySelector('.nav-badge');
        if (matchCount > 0) {
          badge.textContent = String(matchCount);
          navBtn.classList.add('is-active');
          navBtn.classList.remove('is-dim');
        } else {
          badge.textContent = '';
          navBtn.classList.remove('is-active');
          navBtn.classList.add('is-dim');
        }
      }
    });

    emptyMsg.hidden = anyVisible;
  }

  var handleSearchInput = function () {
    runSearch(searchInput.value);
  };
  searchInput.addEventListener('input', handleSearchInput);
  searchInput.addEventListener('search', handleSearchInput);

  /* ---- initial state ---- */
  setActiveCategory(DEFAULT_CATEGORY);

  /* ---- back to top button + light/dark detection ---- */
  function isOverLightBackground(x, y) {
    var prevPointerEvents = toTopBtn.style.pointerEvents;
    toTopBtn.style.pointerEvents = 'none';
    var el = document.elementFromPoint(x, y);
    toTopBtn.style.pointerEvents = prevPointerEvents;

    while (el && el !== document.documentElement) {
      var bg = getComputedStyle(el).backgroundColor;
      var m = bg.match(/[\d.]+/g);
      if (m && (m.length < 4 || parseFloat(m[3]) > 0.5)) {
        var lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
        return lum >= 0.5;
      }
      el = el.parentElement;
    }
    return false;
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      var show = maxScroll > 0 && window.scrollY / maxScroll > 0.45;
      toTopBtn.classList.toggle('is-visible', show);
      if (show) {
        var onLight = isOverLightBackground(window.innerWidth - 65, window.innerHeight - 65);
        toTopBtn.classList.toggle('is-on-light', onLight);
      }
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---- infinite marquee: clone enough copies to always cover the viewport, then loop by exactly one copy's width ---- */
  var stripTrack = document.getElementById('stripTrack');
  var stripTemplate = stripTrack ? stripTrack.querySelector('.strip-group') : null;
  if (stripTrack && stripTemplate) {
    var setupMarquee = function () {
      Array.prototype.slice.call(stripTrack.querySelectorAll('.strip-group')).forEach(function (el, i) {
        if (i > 0) el.parentNode.removeChild(el);
      });
      var unitWidth = stripTemplate.offsetWidth;
      if (!unitWidth) return;
      var minWidth = window.innerWidth * 2 + unitWidth;
      var guard = 0;
      while (stripTrack.scrollWidth < minWidth && guard < 30) {
        stripTrack.appendChild(stripTemplate.cloneNode(true));
        guard++;
      }
      stripTrack.style.setProperty('--marquee-distance', unitWidth + 'px');
      stripTrack.classList.add('is-ready');
    };

    setupMarquee();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(setupMarquee);
    }
    window.addEventListener('load', setupMarquee);

    var marqueeResizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(marqueeResizeTimer);
      marqueeResizeTimer = setTimeout(setupMarquee, 150);
    }, { passive: true });
  }

  /* ---- scroll-reveal for sections ---- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---- live open/closed status, computed from real working hours ---- */
  var openStatusEl = document.getElementById('openStatus');
  var openStatusText = document.getElementById('openStatusText');
  if (openStatusEl && openStatusText) {
    var OPEN_MIN = [600, 540, 540, 540, 540, 540, 540];
    var CLOSE_MIN = [1500, 1500, 1500, 1500, 1500, 1560, 1560];

    var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var fmtMinutes = function (mins) {
      mins = ((mins % 1440) + 1440) % 1440;
      return pad2(Math.floor(mins / 60)) + ':' + pad2(mins % 60);
    };

    var updateOpenStatus = function () {
      var now = new Date();
      var day = now.getDay();
      var minutes = now.getHours() * 60 + now.getMinutes();
      var prevDay = (day + 6) % 7;

      var openToday = minutes >= OPEN_MIN[day];
      var overflowFromYesterday = CLOSE_MIN[prevDay] - 1440;
      var openFromYesterday = minutes < overflowFromYesterday;
      var isOpen = openToday || openFromYesterday;

      if (isOpen) {
        var closesAt = openToday ? CLOSE_MIN[day] : CLOSE_MIN[prevDay];
        openStatusText.textContent = 'Otvoreno sada · radimo do ' + fmtMinutes(closesAt);
        openStatusEl.classList.remove('is-closed');
      } else {
        openStatusText.textContent = 'Trenutno zatvoreno · otvaramo u ' + fmtMinutes(OPEN_MIN[day]);
        openStatusEl.classList.add('is-closed');
      }
    };

    updateOpenStatus();
    setInterval(updateOpenStatus, 60000);
  }

  /* ---- honest, live-computed menu item count ---- */
  var menuItemCountEl = document.getElementById('menuItemCount');
  if (menuItemCountEl) {
    var totalItems = document.querySelectorAll('.menu-item').length;
    if (totalItems > 0) menuItemCountEl.textContent = totalItems + '+';
  }

  /* ---- live order social-proof toast ---- */
  var orderToast = document.getElementById('orderToast');
  if (orderToast) {
    var TOAST_PEOPLE = [
      { n: 'Marko', g: 'm' }, { n: 'Ana', g: 'f' }, { n: 'Nikola', g: 'm' }, { n: 'Jovana', g: 'f' },
      { n: 'Stefan', g: 'm' }, { n: 'Milica', g: 'f' }, { n: 'Aleksandar', g: 'm' }, { n: 'Teodora', g: 'f' },
      { n: 'Uroš', g: 'm' }, { n: 'Ivana', g: 'f' }, { n: 'Nemanja', g: 'm' }, { n: 'Sara', g: 'f' }
    ];
    var TOAST_HOODS = ['Centra', 'Koteža', 'Strelišta', 'Tesle', 'Sodare', 'Mise', 'Nove Mise'];
    var TOAST_ITEMS = ['Kaprićozu', 'Home Special picu', 'Home Wings', 'Pečenicu', 'Home Deluxe picu', 'Ćevape', 'Pileće štapiće', 'Margaritu', 'Home Box'];

    var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    var toastShown = 0;
    var TOAST_MAX = 4;
    var toastDismissed = false;
    var toastHideTimer;

    var showToast = function () {
      if (toastDismissed || toastShown >= TOAST_MAX) return;
      var person = pick(TOAST_PEOPLE);
      var hood = pick(TOAST_HOODS);
      var item = pick(TOAST_ITEMS);
      var minsAgo = 1 + Math.floor(Math.random() * 8);
      var verb = person.g === 'm' ? 'naručio' : 'naručila';

      orderToast.innerHTML =
        '<button type="button" class="order-toast-close" aria-label="Zatvori obaveštenje">×</button>' +
        '<strong>' + person.n + '</strong> iz ' + hood + ' je upravo ' + verb + ' ' + item + '.' +
        '<span class="order-toast-time">pre ' + minsAgo + ' min</span>';

      orderToast.classList.add('is-visible');
      toastShown++;

      var closeBtn = orderToast.querySelector('.order-toast-close');
      closeBtn.addEventListener('click', function () {
        toastDismissed = true;
        orderToast.classList.remove('is-visible');
        clearTimeout(toastHideTimer);
      });

      clearTimeout(toastHideTimer);
      toastHideTimer = setTimeout(function () {
        orderToast.classList.remove('is-visible');
      }, 6000);
    };

    setTimeout(showToast, 6000);
    var toastInterval = setInterval(function () {
      if (toastDismissed || toastShown >= TOAST_MAX) {
        clearInterval(toastInterval);
        return;
      }
      showToast();
    }, 15000);
  }

  /* ---- hero parallax tilt, mouse-driven, smoothed ---- */
  var heroSection = document.getElementById('vrh');
  var heroVisual = document.querySelector('.hero-visual');
  if (heroSection && heroVisual && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
    var targetX = 0, targetY = 0, currentX = 0, currentY = 0;
    var parallaxActive = false;

    var tick = function () {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      heroVisual.style.setProperty('--tiltX', currentY.toFixed(2) + 'deg');
      heroVisual.style.setProperty('--tiltY', currentX.toFixed(2) + 'deg');
      if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01 || parallaxActive) {
        requestAnimationFrame(tick);
      }
    };

    heroSection.addEventListener('mousemove', function (e) {
      var rect = heroSection.getBoundingClientRect();
      var relX = (e.clientX - rect.left) / rect.width - 0.5;
      var relY = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = relX * 7;
      targetY = relY * -7;
      if (!parallaxActive) {
        parallaxActive = true;
        requestAnimationFrame(tick);
      }
    }, { passive: true });

    heroSection.addEventListener('mouseleave', function () {
      targetX = 0;
      targetY = 0;
      parallaxActive = false;
    });
  }
})();

/* Sip & Tell
   Renders every page from data/site.json and data/drinks.json.
   Each page sets <html data-space="day|moon" data-page="home|drink|about" data-root="..">. */

(() => {
  const html = document.documentElement;
  const ROOT = html.dataset.root || '.';
  const SPACE = html.dataset.space;
  const PAGE = html.dataset.page;
  const OTHER = SPACE === 'day' ? 'moon' : 'day';
  const app = document.getElementById('app');

  /* ---------- helpers ---------- */

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const asset = (p) => `${ROOT}/assets/${p}`;
  const pageUrl = (space, file, query = '') => `${ROOT}/${space}/${file}${query}`;
  const drinkUrl = (d, hash = '') => pageUrl(d.space, 'drink.html', `?d=${d.id}${hash}`);
  const markImg = (d, cls = 'mark') => `<img class="${cls}" src="${asset(`marks/${d.id}.svg`)}" alt="" width="70" height="70">`;
  const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  // "[study groups]" in copy becomes an underlined accent link
  const linked = (text, href) => esc(text).replace(/\[(.+?)\]/g, (_, w) => href ? `<a class="inline-link" href="${href}">${w}</a>` : `<span class="inline-link">${w}</span>`);

  const PLURALS = { story: 'stories', match: 'matches' };
  const plural = (n, word) => `${n} ${n === 1 ? word : (PLURALS[word] || `${word}s`)}`;

  /* ---------- stories: counts are always computed, never stored ---------- */

  function tally(stories, key) {
    const counts = new Map();
    stories.forEach((s) => { if (s[key]) counts.set(s[key], (counts.get(s[key]) || 0) + 1); });
    // Ties keep story order, and stories are stored newest first, so ties go to the most recent story.
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }
  const top = (stories, key) => (tally(stories, key)[0] || [null])[0];

  function occasionList(site, occasions) {
    let prev = null;
    const parts = occasions.map((o) => {
      const [prep, word] = site.phrases.occasion[o] || ['while', lower(o)];
      const out = (prep === prev ? '' : `${prep} `) + `<span class="inline-link">${esc(word)}</span>`;
      prev = prep;
      return out;
    });
    if (parts.length < 2) return parts.join('');
    return parts.slice(0, -1).join(', ') + `${parts.length > 2 ? ',' : ''} and ` + parts[parts.length - 1];
  }

  function summarySentence(site, drink) {
    const st = drink.stories;
    const name = esc(drink.sentenceName || drink.name);
    const occ = tally(st, 'occasion');
    const clearLeader = occ.length && occ[0][1] >= 2 && (!occ[1] || occ[1][1] < occ[0][1]);
    if (clearLeader) {
      const [prep, word] = site.phrases.occasion[occ[0][0]] || ['while', lower(occ[0][0])];
      const company = top(st, 'company');
      const companyText = site.phrases.companyMost[company] || site.phrases.companyMost.default.replace('{company}', site.phrases.company[company] || lower(company));
      return `Most people reach for a ${name} ${prep} <span class="inline-link">${esc(word)}</span>, <span class="inline-link">${esc(companyText)}</span>, and say it tastes like <span class="inline-link">${esc(lower(top(st, 'tastesLike')))}</span>.`;
    }
    return `So far, people have reached for a ${name} ${occasionList(site, occ.slice(0, 3).map((o) => o[0]))}.`;
  }

  function storySentence(site, drink, s) {
    const company = s.company === 'Just me'
      ? `, <em>just me</em> and a ${esc(drink.name)}`
      : `, with <em>${esc(site.phrases.company[s.company] || lower(s.company))}</em> and a ${esc(drink.name)}`;
    return `<em>${esc(s.moment)}</em>${company} that tasted like <em>${esc(lower(s.tastesLike))}</em>.`;
  }

  /* ---------- shared chrome ---------- */

  function header(site, drinks) {
    const sp = site.spaces;
    // The switch goes to the same page in the other space. From a drink page, that is the other space's special.
    const otherHref = (space) => {
      if (PAGE === 'drink') return drinkUrl(drinks.find((d) => d.id === sp[space].special));
      return pageUrl(space, PAGE === 'about' ? 'about.html' : 'index.html');
    };
    const door = (space) => {
      const open = space === SPACE;
      const label = sp[space].short;
      const inner = `<img src="${asset(`brand/${sp[space].icon}.svg`)}" alt="" width="20" height="20"><span>${esc(label)}</span>`;
      return open
        ? `<span class="door is-open" aria-current="true">${inner}</span>`
        : `<a class="door" href="${otherHref(space)}">${inner}<span class="visually-hidden"> (switch to ${esc(sp[space].name)})</span></a>`;
    };
    return `
      <header class="site-header">
        <div class="header-row">
          <a class="logo" href="${pageUrl(SPACE, 'index.html')}" aria-label="Sip &amp; Tell home">
            <img src="${asset('brand/eclipse.svg')}" alt="" width="55" height="40"><span class="wordmark">Sip &amp; Tell</span>
          </a>
          <nav class="site-nav" aria-label="Main">
            <a class="text-link" href="${pageUrl(SPACE, 'index.html', '#menu')}">Menu</a>
            <a class="text-link" href="${pageUrl(SPACE, 'about.html')}"${PAGE === 'about' ? ' aria-current="page"' : ''}>About</a>
          </nav>
        </div>
        <nav class="switch" aria-label="Choose a space">${door('day')}${door('moon')}</nav>
      </header>`;
  }

  function footer(site) {
    const sp = site.spaces;
    return `
      <footer class="site-footer">
        <div class="footer-card">
          <div class="footer-col footer-project">
            <p class="wordmark">Sip &amp; Tell</p>
            <p class="t-body">${esc(site.footer.blurb)}</p>
          </div>
          <div class="footer-col">
            <p class="t-meta">Hours</p>
            <p class="t-meta">${esc(sp.day.name)} / ${esc(sp.day.hours)}</p>
            <p class="t-meta">${esc(sp.moon.name)} / ${esc(sp.moon.hours)}</p>
          </div>
          <div class="footer-col">
            <p class="t-meta">Credits</p>
            ${site.footer.credits.map((c) => `<p class="t-meta">${esc(c)}</p>`).join('')}
          </div>
        </div>
      </footer>`;
  }

  /* ---------- home ---------- */

  function renderHome(site, drinks) {
    const sp = site.spaces[SPACE];
    const special = drinks.find((d) => d.id === sp.special);
    const st = special.stories;
    const taste = top(st, 'tastesLike'), occ = top(st, 'occasion'), company = top(st, 'company');
    const ticker = [taste, ...sp.ticker.filter((t) => t !== taste)];
    const tickerItems = (aria) => ticker.map((t, i) => i === 0
      ? `<li class="ticker-pill">${esc(t)}</li>`
      : `<li aria-hidden="${aria}"><span class="sep" aria-hidden="true">/</span>${esc(t)}</li>`).join('');
    const icon = `<img class="title-icon" src="${asset(`brand/${sp.icon}.svg`)}" alt="" width="70" height="70">`;

    return `
      <section class="hero" aria-labelledby="space-title">
        <div class="welcome">
          <h1 id="space-title" class="t-location">
            <span class="title-line">${esc(sp.title[0])}</span>
            <span class="title-line">${esc(sp.title[1])} ${icon}</span>
          </h1>
          <p class="greeting t-header-italic">${esc(sp.greeting)}</p>
          <p class="t-body">${esc(sp.intro)}</p>
          <div class="button-row">
            <a class="btn btn-primary" href="#menu">See the menu ↓</a>
            <button class="btn btn-secondary" type="button" data-action="add-story">Add your story +</button>
          </div>
        </div>
        <a class="stage" href="${drinkUrl(special)}" aria-label="See the ${esc(special.name)}">
          <span class="arch"></span>
          <img class="stage-illo" src="${asset(`illustrations/${special.id}-600.webp`)}" srcset="${asset(`illustrations/${special.id}-600.webp`)} 600w, ${asset(`illustrations/${special.id}-1200.webp`)} 1200w" sizes="(min-width: 900px) 380px, 80vw" alt="Illustration of a ${esc(special.name)}">
        </a>
        <div class="special">
          <p class="t-meta muted">${esc(sp.specialLabel)}</p>
          <h2 class="special-name t-header">${markImg(special)}<span>${esc(special.name)}</span></h2>
          <hr class="rule">
          <dl class="leader-list">
            <div><dt>Tastes like</dt><dd>${esc(taste)}</dd></div>
            <div><dt>Sipped while</dt><dd>${esc(occ)}</dd></div>
            <div><dt>In the company of</dt><dd>${esc(company)}</dd></div>
          </dl>
          <div class="button-row">
            <a class="btn btn-primary" href="${drinkUrl(special)}">See the drink →</a>
            <a class="btn btn-secondary" href="${drinkUrl(special, '#stories')}">${plural(st.length, 'story')} shared</a>
          </div>
        </div>
      </section>

      <section class="ticker" aria-label="Tastes like">
        <p class="ticker-label t-header-italic">tastes like…</p>
        <div class="ticker-track"><ul class="ticker-list">${tickerItems('false')}</ul><ul class="ticker-list" aria-hidden="true">${tickerItems('true')}</ul></div>
      </section>

      <section class="statement">
        <p class="t-header">${linked(sp.statement, '#menu')}</p>
      </section>

      <section class="menu" id="menu" aria-labelledby="menu-title">
        <div class="section-head">
          <h2 id="menu-title" class="t-header">The menu</h2>
          <p class="t-meta muted" id="menu-count"></p>
        </div>
        <div class="filters">
          <p class="t-meta muted" id="filter-label">When do you reach for this?</p>
          <div class="chips" role="group" aria-labelledby="filter-label">
            ${site.occasions.map((o) => `<button type="button" class="chip" aria-pressed="false" data-occasion="${esc(o)}">${esc(o)}<span class="chip-x" aria-hidden="true"> ✕</span></button>`).join('')}
          </div>
        </div>
        <ol class="menu-list" id="menu-list"></ol>
      </section>`;
  }

  function menuRow(site, d, i, guest) {
    const num = String(i + 1).padStart(2, '0');
    const meta = `${site.base[d.mark.base]} / ${site.core[d.mark.core]}`;
    const inner = `<span class="row-num t-meta">${num}</span>${markImg(d, 'row-mark')}<span class="row-name">${esc(d.name)}</span>`
      + (guest ? `<span class="pill-guest t-meta">Served at ${esc(site.spaces[d.space].name.replace(/^The /, 'the '))}</span>` : '')
      + `<span class="row-leader" aria-hidden="true"></span><span class="row-meta t-meta">${esc(meta)}</span>`;

    if (!d.published) {
      return `<li class="menu-row is-unpublished" aria-disabled="true"><div class="row-main">${inner}<span class="visually-hidden"> (coming soon)</span></div></li>`;
    }
    if (guest) {
      return `<li class="menu-row is-guest"><a class="row-main" href="${drinkUrl(d)}">${inner}</a></li>`;
    }
    const st = d.stories;
    const tags = [top(st, 'occasion'), top(st, 'tastesLike'), top(st, 'company')].filter(Boolean);
    return `
      <li class="menu-row is-published">
        <button class="row-main" type="button" aria-expanded="false" aria-controls="pop-${d.id}" data-href="${drinkUrl(d)}">${inner}</button>
        <div class="drink-pop" id="pop-${d.id}">
          <div class="pop-card">
            <h3 class="t-header">${esc(d.name)}</h3>
            <p class="t-body">${esc(d.intro)}</p>
            <ul class="tags">${tags.map((t, k) => `<li class="tag tag-${k}">${esc(t)}</li>`).join('')}</ul>
            <div class="button-row">
              <a class="btn btn-secondary btn-small" href="${drinkUrl(d, '#stories')}">${plural(st.length, 'story')}</a>
              <a class="btn btn-primary btn-small" href="${drinkUrl(d, '#recipe')}">View recipe →</a>
            </div>
          </div>
          <a class="pop-illo" href="${drinkUrl(d)}" tabindex="-1" aria-hidden="true"><img src="${asset(`illustrations/${d.id}-600.webp`)}" alt=""></a>
        </div>
      </li>`;
  }

  function wireMenu(site, drinks) {
    const list = document.getElementById('menu-list');
    const count = document.getElementById('menu-count');
    const own = drinks.filter((d) => d.space === SPACE);
    const guests = drinks.filter((d) => d.space === OTHER && d.published);
    let active = null;

    function draw() {
      let rows, guestRows = [];
      if (!active) {
        rows = own;
        count.textContent = plural(rows.length, 'drink');
      } else {
        const has = (d) => d.stories.some((s) => s.occasion === active);
        rows = own.filter(has);
        guestRows = guests.filter(has);
        const total = rows.length + guestRows.length;
        count.textContent = `${plural(total, 'match')}${guestRows.length ? ` / ${guestRows.length} from ${site.spaces[OTHER].name.replace(/^The /, 'the ')}` : ''}`;
      }
      const all = [...rows.map((d) => [d, false]), ...guestRows.map((d) => [d, true])];
      list.innerHTML = all.length
        ? all.map(([d, g], i) => menuRow(site, d, i, g)).join('')
        : `<li class="menu-empty t-body">No drinks have a ${esc(lower(active))} story yet. Be the first to add one.</li>`;
    }

    document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => {
      const o = chip.dataset.occasion;
      active = active === o ? null : o;
      document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.occasion === active)));
      draw();
    }));

    // Desktop: hover shows the popup and clicking goes to the drink. Touch: tap opens the details in place.
    const desktop = window.matchMedia('(hover: hover) and (min-width: 900px)');
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('button.row-main');
      if (!btn) return;
      if (desktop.matches) { location.href = btn.dataset.href; return; }
      const open = btn.getAttribute('aria-expanded') === 'true';
      list.querySelectorAll('button.row-main[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      btn.setAttribute('aria-expanded', String(!open));
    });
    draw();
  }

  /* ---------- drink ---------- */

  const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  function formatQty(qty, unit, units, site) {
    if (qty == null) return '';
    let q = qty, u = unit;
    if (units === 'ml' && (unit === 'oz' || unit === 'tsp')) {
      q = Math.round(qty * (unit === 'oz' ? site.units.ml_per_oz : site.units.ml_per_tsp));
      u = 'ml';
    }
    const whole = Math.floor(q), frac = Math.round((q - whole) * 100) / 100;
    const num = FRACTIONS[frac] ? `${whole || ''}${FRACTIONS[frac]}` : String(Math.round(q * 100) / 100);
    const label = u === 'bag' && q !== 1 ? 'bags' : u;
    return `${num} ${label}`;
  }

  function renderDrink(site, drinks) {
    const params = new URLSearchParams(location.search);
    const id = params.get('d') || site.spaces[SPACE].special;
    const d = drinks.find((x) => x.id === id && x.published);
    if (!d) return `<section class="not-found"><h1 class="t-header">That drink isn’t on the menu yet.</h1><p><a class="btn btn-primary" href="${pageUrl(SPACE, 'index.html')}">Back to the bar</a></p></section>`;
    if (d.space !== SPACE) { location.replace(drinkUrl(d, location.hash)); return ''; }
    document.title = `${d.name} / Sip & Tell`;
    const st = d.stories;
    const versions = Object.entries(d.recipe.versions);

    const qBlock = (label, key) => {
      const rows = tally(st, key);
      const shown = rows.length > 3 ? [...rows.slice(0, 3), ['Other', rows.slice(3).reduce((a, r) => a + r[1], 0)]] : rows;
      return `
        <div class="answer-row">
          <p class="t-meta muted">${esc(label)}</p>
          <ul class="bar">${shown.map(([name, n]) => `<li class="seg${name === 'Other' ? ' seg-other' : ''}" style="flex-grow:${n}"><span class="t-meta">${esc(name)}</span><span class="t-meta">${String(n).padStart(2, '0')}</span></li>`).join('')}</ul>
        </div>`;
    };

    return `
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a class="text-link back-link" href="${pageUrl(SPACE, 'index.html')}">← Back to the bar</a>
        <p class="t-meta muted crumbs">Menu / ${esc(d.name)}</p>
      </nav>

      <section class="drink-hero">
        <div class="title-card card">
          <div class="title-top">
            <h1 class="drink-name t-display">${markImg(d, 'mark drink-mark')}<span>${esc(d.name)}</span></h1>
            <p class="t-header-italic accent">${esc(d.intro)}</p>
          </div>
          <hr class="rule">
          <dl class="details">
            <div><dt class="t-meta muted">About</dt><dd class="t-body">${esc(d.about)}</dd></div>
            <div><dt class="t-meta muted">Fun fact</dt><dd class="t-body">${esc(d.funFact)}</dd></div>
            <div><dt class="t-meta muted">Character</dt><dd class="traits">
              <span><span class="t-meta muted">Base</span><span class="t-meta">${esc(site.base[d.mark.base])}</span></span>
              <span><span class="t-meta muted">Core</span><span class="t-meta">${esc(site.core[d.mark.core])}</span></span>
              <span><span class="t-meta muted">Served</span><span class="t-meta">${esc(d.served.join(' / '))}</span></span>
            </dd></div>
          </dl>
          <a class="btn btn-primary btn-wide" href="#stories">See community stories about this drink ↓</a>
        </div>
        <div class="mark-card">
          <img src="${asset(`illustrations/${d.id}-1200.webp`)}" srcset="${asset(`illustrations/${d.id}-600.webp`)} 600w, ${asset(`illustrations/${d.id}-1200.webp`)} 1200w" sizes="(min-width: 900px) 560px, 90vw" alt="Illustration of a ${esc(d.name)}">
        </div>
      </section>

      <section class="recipe" id="recipe" aria-labelledby="recipe-title">
        <div class="section-head">
          <h2 id="recipe-title" class="t-header">Recipe</h2>
          <a class="btn btn-primary btn-small" id="download-recipe" href="${asset(`recipe-cards/${d.id}-web.jpg`)}" download="sip-and-tell-${d.id}.jpg">Download recipe ↓</a>
        </div>
        <div class="recipe-card card" id="recipe-card">
          <div class="recipe-top">
            <h3 class="t-header">${esc(d.name)}</h3>
            <div class="controls">
              <div class="toggle" role="group" aria-label="Version">${versions.map(([k, v], i) => `<button type="button" aria-pressed="${i === 0}" data-version="${k}">${esc(v.label)}</button>`).join('')}</div>
              <div class="toggle" role="group" aria-label="Units"><button type="button" aria-pressed="true" data-units="oz">oz</button><button type="button" aria-pressed="false" data-units="ml">ml</button></div>
              <div class="stepper" role="group" aria-label="Servings">
                <button type="button" data-step="-1" aria-label="Fewer servings">−</button>
                <span class="t-meta" id="serves" aria-live="polite">Serves 1</span>
                <button type="button" data-step="1" aria-label="More servings">+</button>
              </div>
            </div>
          </div>
          <div class="recipe-group"><p class="t-meta muted">Ingredients</p><ul class="ingredients" id="ingredients"></ul></div>
          <hr class="rule">
          <div class="recipe-group"><p class="t-meta muted">Method</p><ol class="method" id="method"></ol></div>
        </div>
      </section>

      <section class="people" aria-labelledby="people-title">
        <div class="section-head">
          <h2 id="people-title" class="t-header">What people say</h2>
          <p class="t-meta muted">Based on ${plural(st.length, 'story')}</p>
        </div>
        <div class="people-card card">
          <p class="t-header">${summarySentence(site, d)}</p>
          <button class="btn btn-primary btn-small" type="button" aria-expanded="false" aria-controls="answers" id="answers-toggle">See all answers ↓</button>
          <div class="answers" id="answers" hidden>
            <hr class="rule">
            ${qBlock('When do you reach for this?', 'occasion')}
            ${qBlock('This drink tastes like…', 'tastesLike')}
            ${qBlock('Who’s at the table?', 'company')}
          </div>
        </div>
      </section>

      <section class="archive" id="stories" aria-labelledby="stories-title">
        <div class="section-head">
          <h2 id="stories-title" class="t-header">Story Archive</h2>
          <button class="btn btn-primary btn-small" type="button" data-action="add-story">Add your story +</button>
        </div>
        <ul class="stories" tabindex="0" aria-label="Stories, scroll sideways for more">
          ${st.map((s) => `
            <li class="story-card card">
              <div class="story-top"><span class="t-meta accent">${esc(s.occasion)}</span>${markImg(d, 'story-mark')}</div>
              <p class="story-text t-body">${storySentence(site, d, s)}</p>
              ${s.note ? `<p class="t-body">“${esc(s.note)}”</p>` : ''}
              <hr class="rule">
              <div class="story-bottom"><span class="signed t-inline-italic accent">— ${esc(s.signedAs)}</span><span class="t-meta muted">${esc(s.review)}</span></div>
            </li>`).join('')}
        </ul>
      </section>`;
  }

  function wireDrink(site, drinks) {
    const id = new URLSearchParams(location.search).get('d') || site.spaces[SPACE].special;
    const d = drinks.find((x) => x.id === id);
    if (!d || !document.getElementById('recipe-card')) return;
    const state = { version: Object.keys(d.recipe.versions)[0], units: 'oz', serves: 1 };
    const max = d.recipe.servesMax || 3;

    function draw() {
      const v = d.recipe.versions[state.version];
      document.getElementById('ingredients').innerHTML = v.ingredients.map((ing) => {
        const qty = ing.qty != null ? formatQty(ing.qty * state.serves, ing.unit, state.units, site) : '';
        const name = esc(ing.item) + (ing.optional ? ', optional' : '');
        return qty
          ? `<li><span>${name}</span><span class="leader" aria-hidden="true"></span><span>${esc(qty)}</span></li>`
          : `<li><span>${name}</span></li>`;
      }).join('');
      document.getElementById('method').innerHTML = v.method.map((m) => `<li>${esc(m)}</li>`).join('');
      document.getElementById('serves').textContent = `Serves ${state.serves}`;
      document.querySelectorAll('[data-version]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.version === state.version)));
      document.querySelectorAll('[data-units]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.units === state.units)));
      document.querySelector('[data-step="-1"]').disabled = state.serves <= 1;
      document.querySelector('[data-step="1"]').disabled = state.serves >= max;
    }
    document.querySelectorAll('[data-version]').forEach((b) => b.addEventListener('click', () => { state.version = b.dataset.version; draw(); }));
    document.querySelectorAll('[data-units]').forEach((b) => b.addEventListener('click', () => { state.units = b.dataset.units; draw(); }));
    document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      state.serves = Math.min(max, Math.max(1, state.serves + Number(b.dataset.step))); draw();
    }));
    draw();

    const toggle = document.getElementById('answers-toggle');
    const answers = document.getElementById('answers');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      answers.hidden = open;
      toggle.textContent = open ? 'See all answers ↓' : 'Hide answers ↑';
      toggle.classList.toggle('btn-primary', open);
      toggle.classList.toggle('btn-secondary', !open);
    });
  }

  /* ---------- about ---------- */

  function renderAbout(site, drinks) {
    const a = site.about;
    const ex = site.spaces[SPACE].aboutExample;
    const exDrink = drinks.find((d) => d.id === ex.drink);
    const tiles = (group, kind) => `
      <div class="icon-group">
        <p class="t-meta muted">${esc(group.label)}</p>
        <ul class="icon-row">${group.items.map(([k, label]) => `<li><span class="icon-tile icon-${kind}"><img src="${asset(`icons/${kind}-${k}.svg`)}" alt=""></span><span class="t-meta">${esc(label)}</span></li>`).join('')}</ul>
      </div>`;
    return `
      <section class="about-intro card">
        <p class="t-meta muted">${esc(a.label)}</p>
        <h1 class="t-header">${linked(a.headline)}</h1>
        <div class="about-columns">${a.columns.map((c) => `<p class="t-body">${esc(c)}</p>`).join('')}</div>
      </section>

      <section class="steps-section" aria-labelledby="steps-title">
        <h2 id="steps-title" class="t-header">${esc(a.stepsTitle)}</h2>
        <ol class="steps">${a.steps.map((s, i) => `
          <li class="step card"><span class="t-meta accent">${String(i + 1).padStart(2, '0')}</span><h3 class="t-header-italic accent">${esc(s.title)}</h3><p class="t-body">${esc(s.text)}</p></li>`).join('')}
        </ol>
      </section>

      <section class="icons-section" aria-labelledby="icons-title">
        <h2 id="icons-title" class="t-header">${esc(a.iconsTitle)}</h2>
        <div class="icons-card card">
          <figure class="icon-example"><img src="${asset(`marks/${exDrink.id}.svg`)}" alt="" width="200" height="200"><figcaption class="t-meta">${esc(ex.caption)}</figcaption></figure>
          <div class="icon-lists">${tiles(a.silhouettes, 'base')}${tiles(a.cores, 'core')}</div>
        </div>
      </section>

      <section class="pull-quote">
        <div class="stacked-logo"><img src="${asset('brand/eclipse.svg')}" alt="" width="138" height="100"><p class="wordmark">Sip &amp; Tell</p><p class="t-meta muted">${esc(a.tagline)}</p></div>
        <p class="t-header">${linked(a.quote)}</p>
        <button class="btn btn-primary" type="button" data-action="add-story">Add your story +</button>
      </section>`;
  }

  /* ---------- boot ---------- */

  async function boot() {
    try {
      const [site, data] = await Promise.all([
        fetch(`${ROOT}/data/site.json`).then((r) => r.json()),
        fetch(`${ROOT}/data/drinks.json`).then((r) => r.json()),
      ]);
      site.units = data.units;
      const drinks = data.drinks;
      const body = PAGE === 'drink' ? renderDrink(site, drinks) : PAGE === 'about' ? renderAbout(site, drinks) : renderHome(site, drinks);
      app.innerHTML = `${header(site, drinks)}<main id="main" class="page page-${PAGE}">${body}</main>${footer(site)}`;
      if (PAGE === 'home') wireMenu(site, drinks);
      if (PAGE === 'drink') wireDrink(site, drinks);
      // The questionnaire arrives in pass two.
      document.querySelectorAll('[data-action="add-story"]').forEach((b) => b.addEventListener('click', () => alert('The story questionnaire is coming in the next build.')));
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    } catch (err) {
      console.error(err);
      app.innerHTML = '<p class="noscript">Sip &amp; Tell couldn’t load. If you opened the file directly, run it through a local server.</p>';
    }
  }
  boot();
})();

const GENEPEDIA_SEARCH_INDEX_PATH = 'data/search-index.json';
const GENEPEDIA_SEARCH_STYLE_ID = 'genepedia-search-styles';
const GENEPEDIA_SEARCH_DROPDOWN_LIMIT = 6;

const GENEPEDIA_SEARCH_STYLES = String.raw`
.genepedia-search-anchor {
  position: relative;
}

.genepedia-search__dropdown {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  z-index: 1200;
  margin: 0;
  padding: 0.35rem 0;
  list-style: none;
  border: 1px solid var(--genepedia-search-border, rgba(0, 0, 0, 0.12));
  border-radius: 0.125rem;
  background: var(--genepedia-search-dropdown-bg, #fff);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
  max-height: 18rem;
  overflow: auto;
}

.genepedia-search__dropdown[hidden] {
  display: none !important;
}

.genepedia-search__option {
  margin: 0;
  padding: 0;
}

.genepedia-search__option-link {
  display: block;
  padding: 0.55rem 0.85rem;
  color: var(--genepedia-search-fg, #202122);
  font: 0.9375rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  text-decoration: none;
  text-align: left;
}

.genepedia-search__option-link:hover,
.genepedia-search__option.is-active .genepedia-search__option-link {
  background: var(--genepedia-search-hover, rgba(0, 0, 0, 0.05));
  color: var(--genepedia-search-fg, #202122);
  text-decoration: none;
}

.genepedia-search__option-title {
  display: block;
  font-weight: 600;
}

.genepedia-search__option-description {
  display: block;
  margin-top: 0.15rem;
  color: var(--genepedia-search-muted, #54595d);
  font-size: 0.8125rem;
  line-height: 1.35;
}

.genepedia-search__dropdown-footer {
  margin: 0.35rem 0 0;
  padding: 0.35rem 0 0;
  border-top: 1px solid var(--genepedia-search-border, rgba(0, 0, 0, 0.12));
}

.genepedia-search__dropdown-all {
  display: block;
  padding: 0.55rem 0.85rem;
  color: var(--genepedia-search-link, #3366cc);
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  text-align: left;
  text-decoration: none;
}

.genepedia-search__dropdown-all:hover {
  background: var(--genepedia-search-hover, rgba(0, 0, 0, 0.05));
  text-decoration: none;
}

.genepedia-search__dropdown-empty {
  padding: 0.65rem 0.85rem;
  color: var(--genepedia-search-muted, #54595d);
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

body.theme-dark {
  --genepedia-search-border: rgba(255, 255, 255, 0.12);
  --genepedia-search-dropdown-bg: #313438;
  --genepedia-search-fg: #eaecf0;
  --genepedia-search-muted: #a7adb4;
  --genepedia-search-hover: rgba(255, 255, 255, 0.08);
  --genepedia-search-link: #6b9eff;
}

body:not(.theme-dark) {
  --genepedia-search-border: rgba(0, 0, 0, 0.12);
  --genepedia-search-dropdown-bg: #ffffff;
  --genepedia-search-fg: #202122;
  --genepedia-search-muted: #54595d;
  --genepedia-search-hover: rgba(0, 0, 0, 0.05);
  --genepedia-search-link: #3366cc;
}

.header-chrome__search-form.genepedia-search-anchor {
  position: relative;
  overflow: visible;
}

.header-chrome__search-form .genepedia-search__dropdown {
  min-width: 16rem;
}

.search-page {
  max-width: 48rem;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  box-sizing: border-box;
}

.search-page__title {
  margin: 0 0 1rem;
  font-family: Linux Libertine, Hoefler Text, Georgia, Times New Roman, Times, serif;
  font-size: 1.75rem;
  font-weight: 400;
  line-height: 1.2;
}

.search-page__form {
  margin-bottom: 1.5rem;
}

.search-page__form .search-input {
  width: 100%;
  max-width: none;
}

.search-page__form #searchInput {
  border-right-width: var(--border-width-base);
  border-radius: var(--border-radius-base);
}

.search-page__form fieldset {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.search-page__form .search-input {
  flex: 1 1 auto;
}

.search-page__meta {
  margin: 0 0 1rem;
  color: var(--genepedia-search-muted, #54595d);
  font-size: 0.9375rem;
}

.search-page__results {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--genepedia-search-border, rgba(0, 0, 0, 0.12));
}

.search-page__result {
  border-bottom: 1px solid var(--genepedia-search-border, rgba(0, 0, 0, 0.12));
}

.search-page__result-link {
  display: block;
  padding: 1rem 0.25rem;
  color: var(--genepedia-search-link, #3366cc);
  text-decoration: none;
}

.search-page__result-link:hover {
  text-decoration: underline;
}

.search-page__result-title {
  display: block;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
}

.search-page__result-description {
  display: block;
  margin-top: 0.35rem;
  color: var(--genepedia-search-fg, #202122);
  font-size: 0.9375rem;
  line-height: 1.5;
}

.search-page__empty {
  padding: 2rem 0;
  color: var(--genepedia-search-muted, #54595d);
  text-align: center;
}
`;

let searchIndexPromise = null;

function normalizeSiteRootPrefix(prefix) {
  if (!prefix || prefix === '/') {
    return '';
  }

  return prefix;
}

function ensureSearchStyles() {
  if (document.getElementById(GENEPEDIA_SEARCH_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = GENEPEDIA_SEARCH_STYLE_ID;
  style.textContent = GENEPEDIA_SEARCH_STYLES;
  document.head.append(style);
}

function getSiteRootPrefix() {
  const pathname = window.location.pathname.replace(/\\/g, '/');
  const nestedProfileMatch = pathname.match(/^(.*\/)people\/\d+\/[^/]+$/);
  if (nestedProfileMatch) {
    return normalizeSiteRootPrefix(nestedProfileMatch[1]);
  }

  const peopleDirectoryMatch = pathname.match(/^(.*\/)people\/\d+\//);
  if (peopleDirectoryMatch) {
    return normalizeSiteRootPrefix(peopleDirectoryMatch[1]);
  }

  if (pathname.includes('/pages/')) {
    return '../';
  }

  return '';
}

function resolveSearchIndexUrl() {
  return new URL(GENEPEDIA_SEARCH_INDEX_PATH, new URL(getSiteRootPrefix(), window.location.href)).href;
}

function resolvePersonProfileUrl(personId) {
  return new URL(`people/${personId}/profile.html`, new URL(getSiteRootPrefix(), window.location.href)).href;
}

function resolveSearchPageUrl(query = '') {
  const pathname = window.location.pathname.replace(/\\/g, '/');
  const searchPagePath = pathname.includes('/pages/') ? 'search.html' : 'pages/search.html';
  const url = new URL(searchPagePath, new URL(getSiteRootPrefix(), window.location.href));
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    url.searchParams.set('q', trimmedQuery);
  }

  return url.href;
}

function normalizeSearchText(value) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function scorePersonEntry(query, entry) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return 0;
  }

  const title = normalizeSearchText(entry.title);
  const aliases = (entry.aliases || []).map(normalizeSearchText);
  const description = normalizeSearchText(entry.description);
  const id = String(entry.id || '').toLowerCase();
  let score = 0;

  if (title === normalizedQuery || id === normalizedQuery) {
    score = Math.max(score, 120);
  }

  if (title.startsWith(normalizedQuery) || id.startsWith(normalizedQuery)) {
    score = Math.max(score, 95);
  }

  if (title.includes(normalizedQuery)) {
    score = Math.max(score, 80);
  }

  if (description.includes(normalizedQuery)) {
    score = Math.max(score, 55);
  }

  aliases.forEach((alias) => {
    if (alias === normalizedQuery) {
      score = Math.max(score, 90);
    } else if (alias.startsWith(normalizedQuery)) {
      score = Math.max(score, 75);
    } else if (alias.includes(normalizedQuery)) {
      score = Math.max(score, 60);
    }
  });

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  if (queryTokens.length > 1) {
    const haystack = [title, description, ...aliases].join(' ');
    const allTokensMatch = queryTokens.every((token) => haystack.includes(token));
    if (allTokensMatch) {
      score = Math.max(score, 70);
    }
  }

  return score;
}

async function loadSearchIndex() {
  if (!searchIndexPromise) {
    searchIndexPromise = fetch(resolveSearchIndexUrl())
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load search index: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => data?.people || [])
      .catch((error) => {
        console.error(error);
        return [];
      });
  }

  return searchIndexPromise;
}

async function findPersonMatches(query, { limit = 8 } = {}) {
  const people = await loadSearchIndex();

  return people
    .map((entry) => ({
      entry,
      score: scorePersonEntry(query, entry),
      url: resolvePersonProfileUrl(entry.id),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit);
}

function getSearchInput(form) {
  return form.querySelector('input[name="search"], input[type="search"]');
}

function getDropdownAnchor(form) {
  return form.querySelector('.search-input') || form;
}

function createDropdown(anchor) {
  const dropdown = document.createElement('ul');
  dropdown.className = 'genepedia-search__dropdown';
  dropdown.setAttribute('role', 'listbox');
  dropdown.hidden = true;
  anchor.append(dropdown);
  return dropdown;
}

function renderDropdownItems(dropdown, matches, query) {
  dropdown.textContent = '';

  if (matches.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'genepedia-search__dropdown-empty';
    empty.textContent = query.trim() ? `No profiles match "${query.trim()}".` : 'Type to search Genepedia.';
    dropdown.append(empty);
    return;
  }

  matches.forEach((match, index) => {
    const item = document.createElement('li');
    item.className = 'genepedia-search__option';
    item.setAttribute('role', 'option');
    item.dataset.index = String(index);

    const link = document.createElement('a');
    link.className = 'genepedia-search__option-link';
    link.href = match.url;

    const title = document.createElement('span');
    title.className = 'genepedia-search__option-title';
    title.textContent = match.entry.title;
    link.append(title);

    if (match.entry.description) {
      const description = document.createElement('span');
      description.className = 'genepedia-search__option-description';
      description.textContent = match.entry.description;
      link.append(description);
    }

    item.append(link);
    dropdown.append(item);
  });

  const footer = document.createElement('li');
  footer.className = 'genepedia-search__dropdown-footer';
  footer.setAttribute('role', 'presentation');

  const viewAll = document.createElement('a');
  viewAll.className = 'genepedia-search__dropdown-all';
  viewAll.href = resolveSearchPageUrl(query);
  viewAll.textContent = `View all results for “${query.trim()}”`;
  footer.append(viewAll);
  dropdown.append(footer);
}

function setActiveDropdownOption(dropdown, index) {
  const options = [...dropdown.querySelectorAll('.genepedia-search__option')];
  options.forEach((option, optionIndex) => {
    const isActive = optionIndex === index;
    option.classList.toggle('is-active', isActive);
    option.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  return options[index] || null;
}

function bindGenepediaSearchForm(form) {
  if (!form || form.dataset.genepediaSearchBound === 'true') {
    return;
  }

  ensureSearchStyles();
  form.dataset.genepediaSearchBound = 'true';

  const input = getSearchInput(form);
  if (!input) {
    return;
  }

  const anchor = getDropdownAnchor(form);
  anchor.classList.add('genepedia-search-anchor');
  const dropdown = createDropdown(anchor);

  let activeIndex = -1;
  let debounceTimer = null;
  let latestMatches = [];

  const closeDropdown = () => {
    dropdown.hidden = true;
    activeIndex = -1;
    input.setAttribute('aria-expanded', 'false');
  };

  const openDropdown = () => {
    dropdown.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const updateDropdown = async () => {
    const query = input.value;
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      closeDropdown();
      return;
    }

    latestMatches = await findPersonMatches(trimmedQuery, { limit: GENEPEDIA_SEARCH_DROPDOWN_LIMIT });
    renderDropdownItems(dropdown, latestMatches, trimmedQuery);
    activeIndex = -1;
    openDropdown();
  };

  const scheduleUpdate = () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      void updateDropdown();
    }, 150);
  };

  const goToSearchPage = (query) => {
    const trimmedQuery = (query || '').trim();
    window.location.assign(resolveSearchPageUrl(trimmedQuery));
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    closeDropdown();

    if (activeIndex >= 0 && latestMatches[activeIndex]) {
      window.location.assign(latestMatches[activeIndex].url);
      return;
    }

    goToSearchPage(input.value);
  });

  input.addEventListener('input', scheduleUpdate);

  input.addEventListener('focus', () => {
    if (input.value.trim()) {
      scheduleUpdate();
    }
  });

  input.addEventListener('keydown', (event) => {
    const options = dropdown.hidden ? [] : [...dropdown.querySelectorAll('.genepedia-search__option')];

    if (event.key === 'ArrowDown') {
      if (!options.length) {
        return;
      }

      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, options.length - 1);
      setActiveDropdownOption(dropdown, activeIndex)?.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (event.key === 'ArrowUp') {
      if (!options.length) {
        return;
      }

      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      setActiveDropdownOption(dropdown, activeIndex)?.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (event.key === 'Escape') {
      closeDropdown();
      return;
    }
  });

  dropdown.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });

  document.addEventListener('click', (event) => {
    if (!form.contains(event.target)) {
      closeDropdown();
    }
  });

  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', dropdown.id || '');
  if (!dropdown.id) {
    dropdown.id = `genepedia-search-dropdown-${Math.random().toString(36).slice(2, 9)}`;
    input.setAttribute('aria-controls', dropdown.id);
  }
  input.setAttribute('aria-expanded', 'false');
}

async function renderSearchResultsPage() {
  const resultsRoot = document.getElementById('genepedia-search-results');
  if (!resultsRoot) {
    return;
  }

  ensureSearchStyles();

  const params = new URLSearchParams(window.location.search);
  const query = (params.get('q') || params.get('search') || '').trim();
  const titleEl = document.getElementById('genepedia-search-page-title');
  const metaEl = document.getElementById('genepedia-search-page-meta');
  const formInput = document.querySelector('#search-page-form input[name="search"], #search-page-form input[type="search"]');

  if (formInput) {
    formInput.value = query;
  }

  if (titleEl) {
    titleEl.textContent = query ? `Search results for “${query}”` : 'Search Genepedia';
  }

  document.title = query ? `Search: ${query} - Genepedia` : 'Search - Genepedia';

  if (!query) {
    if (metaEl) {
      metaEl.textContent = 'Enter a name or keyword to find people in Genepedia.';
    }
    resultsRoot.innerHTML = '<p class="search-page__empty">Try searching for Shaun Roselt, Hanli, wife, or Mandela.</p>';
    return;
  }

  const matches = await findPersonMatches(query, { limit: 100 });

  if (metaEl) {
    metaEl.textContent = matches.length === 1
      ? '1 result'
      : `${matches.length} results`;
  }

  if (matches.length === 0) {
    resultsRoot.innerHTML = `<p class="search-page__empty">No profiles matched “${query}”. Try another spelling or a shorter keyword.</p>`;
    return;
  }

  const list = document.createElement('ul');
  list.className = 'search-page__results';

  matches.forEach((match) => {
    const item = document.createElement('li');
    item.className = 'search-page__result';

    const link = document.createElement('a');
    link.className = 'search-page__result-link';
    link.href = match.url;

    const title = document.createElement('span');
    title.className = 'search-page__result-title';
    title.textContent = match.entry.title;
    link.append(title);

    if (match.entry.description) {
      const description = document.createElement('span');
      description.className = 'search-page__result-description';
      description.textContent = match.entry.description;
      link.append(description);
    }

    item.append(link);
    list.append(item);
  });

  resultsRoot.replaceChildren(list);
}

function initGenepediaSearch() {
  document.querySelectorAll('form[role="search"], #search-form, #header-chrome-search-form, #search-page-form').forEach(bindGenepediaSearchForm);
  void renderSearchResultsPage();
}

window.GenepediaSearch = {
  findPersonMatches,
  resolveSearchPageUrl,
  resolvePersonProfileUrl,
  bindGenepediaSearchForm,
  renderSearchResultsPage,
  initGenepediaSearch,
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGenepediaSearch, { once: true });
} else {
  initGenepediaSearch();
}

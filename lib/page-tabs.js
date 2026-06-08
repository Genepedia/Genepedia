/* Page / Changes tab switching for full-page-toolbar variant="page" pages */
(function () {
  const PAGE_TABS = ['page', 'changes'];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function getSelectedTab() {
    const hash = (window.location.hash || '').replace(/^#/, '');
    return hash === 'changes' ? 'changes' : 'page';
  }

  function getSourcePath() {
    const path = window.location.pathname.replace(/\\/g, '/');
    const markers = ['pages/', 'people/'];

    for (const marker of markers) {
      const index = path.indexOf(marker);
      if (index !== -1) {
        return path.slice(index);
      }
    }

    return path.replace(/^\//, '');
  }

  function getGitHubCommitUrl(hash, repo) {
    const repoSlug = String(repo || '').replace(/^\/+|\/+$/g, '');
    const commitHash = String(hash || '').trim();

    if (!repoSlug || !commitHash) {
      return '';
    }

    return `https://github.com/${repoSlug}/commit/${encodeURIComponent(commitHash)}`;
  }

  function getGitHubFileUrl(hash, filePath, repo) {
    const repoSlug = String(repo || '').replace(/^\/+|\/+$/g, '');
    const commitHash = String(hash || '').trim();
    const cleanPath = String(filePath || '').replace(/^\/+/, '');

    if (!repoSlug || !commitHash || !cleanPath) {
      return '';
    }

    return `https://github.com/${repoSlug}/blob/${encodeURIComponent(commitHash)}/${cleanPath}`;
  }

  function getGitHubAuthorUrl(commit) {
    return String(commit?.author_url || '').trim();
  }

  function formatCommitDate(value) {
    if (!value) {
      return 'Unknown date';
    }

    try {
      return new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return value;
    }
  }

  function resolveFileCommitsApiUrl(sourcePath) {
    const apiBase = String(
      window.App?.getGitHubApiBase?.()
      || window.App?.GitHubApiBase
      || '',
    ).trim().replace(/\/+$/, '');

    if (!apiBase) {
      return '';
    }

    const url = new URL('github-file-commits.php', `${apiBase}/`);
    url.searchParams.set('path', sourcePath);
    return url.href;
  }

  async function fetchFileCommitsFromApi(sourcePath) {
    const cleanPath = String(sourcePath || '').replace(/^\/+/, '');
    const url = resolveFileCommitsApiUrl(cleanPath);

    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const response = await fetch(url);
    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || !payload?.ok) {
      const message = payload?.message || `Failed to load commit history (${response.status})`;
      const requestError = new Error(message);
      requestError.status = response.status;
      throw requestError;
    }

    return {
      commits: Array.isArray(payload.commits) ? payload.commits : [],
      repo: String(payload.repo || '').trim(),
    };
  }

  function renderChangesView(commits, sourcePath, repo) {
    const safePath = escapeHtml(sourcePath);

    if (!Array.isArray(commits) || commits.length === 0) {
      return `
        <div class="page-changes">
          <p class="page-changes__status">No commit history was found for <code>${safePath}</code>.</p>
        </div>
      `;
    }

    const rows = commits.map((commit) => {
      const hash = String(commit.hash || '');
      const fileUrl = escapeHtml(getGitHubFileUrl(hash, sourcePath, repo));
      const commitUrl = escapeHtml(getGitHubCommitUrl(hash, repo));
      const authorUrl = escapeHtml(getGitHubAuthorUrl(commit));
      const shortHash = escapeHtml(hash.slice(0, 7) || '—');
      const subject = escapeHtml(commit.subject || 'No commit message');
      const author = escapeHtml(commit.author || 'Unknown author');
      const date = escapeHtml(formatCommitDate(commit.date));
      const authorMarkup = authorUrl
        ? `<a class="page-changes__author" href="${authorUrl}" target="_blank" rel="noopener noreferrer">${author}</a>`
        : `<span class="page-changes__author">${author}</span>`;
      const hashMarkup = commitUrl
        ? `<a class="page-changes__hash" href="${commitUrl}" target="_blank" rel="noopener noreferrer"><code>${shortHash}</code></a>`
        : `<code class="page-changes__hash">${shortHash}</code>`;

      return `
        <li class="page-changes__item">
          <a class="page-changes__subject" href="${fileUrl}" target="_blank" rel="noopener noreferrer">${subject}</a>
          <div class="page-changes__meta">
            <span class="page-changes__date">${date}</span>
            ${authorMarkup}
            ${hashMarkup}
          </div>
        </li>
      `;
    }).join('');

    return `
      <section class="page-changes" aria-label="Change history">
        <ol class="page-changes__list">
          ${rows}
        </ol>
      </section>
    `;
  }

  function syncToolbarTabSelection(toolbar, tab = getSelectedTab()) {
    if (toolbar) {
      toolbar.querySelectorAll('.people-page__tab-link[data-tab]').forEach((link) => {
        const isSelected = link.dataset.tab === tab;
        link.closest('.people-page__tab-item')?.classList.toggle('is-selected', isSelected);
        link.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
    }

    try {
      window.dispatchEvent(new CustomEvent('page-tab:sync', { detail: { tab } }));
    } catch (error) {
      // ignore
    }
  }

  function initPageTabs() {
    const toolbar = document.querySelector('full-page-toolbar[variant="page"]');
    const main = document.querySelector('article > main.main-content');

    if (!toolbar || !main || main.dataset.pageTabsBound === 'true') {
      return;
    }

    main.dataset.pageTabsBound = 'true';

    const pageHtml = main.innerHTML;
    const sourcePath = getSourcePath();
    let historyDatasetPromise = null;

    const loadHistoryForPage = () => {
      if (!historyDatasetPromise) {
        historyDatasetPromise = fetchFileCommitsFromApi(sourcePath);
      }

      return historyDatasetPromise;
    };

    const render = async () => {
      const tab = getSelectedTab();

      if (tab === 'page') {
        main.innerHTML = pageHtml;
        main.classList.remove('is-changes-view');
        main.removeAttribute('aria-busy');
        return;
      }

      main.classList.add('is-changes-view');
      main.setAttribute('aria-busy', 'true');
      main.innerHTML = '<p class="page-changes__status">Loading change history…</p>';

      try {
        const { commits, repo } = await loadHistoryForPage();
        main.innerHTML = renderChangesView(commits, sourcePath, repo);
      } catch (error) {
        console.error(error);
        const message = error?.message || 'Could not load change history. Please try again.';
        main.innerHTML = `<p class="page-changes__status">${escapeHtml(message)}</p>`;
      } finally {
        main.removeAttribute('aria-busy');
      }
    };

    const selectTab = (tab, { updateHash = true } = {}) => {
      if (!PAGE_TABS.includes(tab)) {
        return;
      }

      if (updateHash) {
        const nextHash = tab === 'page' ? '#page' : '#changes';
        if (window.location.hash !== nextHash) {
          history.replaceState(null, '', nextHash);
        }
      }

      syncToolbarTabSelection(toolbar, tab);
      render();
    };

    toolbar.addEventListener('click', (event) => {
      const link = event.target.closest?.('.people-page__tab-link[data-tab]');
      if (!link || !toolbar.contains(link)) {
        return;
      }

      event.preventDefault();
      selectTab(link.dataset.tab);
    });

    const syncChrome = () => {
      syncToolbarTabSelection(toolbar, getSelectedTab());
    };

    window.addEventListener('hashchange', () => {
      syncChrome();
      render();
    });

    window.addEventListener('app:namechange', syncChrome);
    window.addEventListener('load', syncChrome);

    syncChrome();
    render();
    setTimeout(syncChrome, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageTabs, { once: true });
  } else {
    initPageTabs();
  }

  window.AppPageTabs = {
    init: initPageTabs,
    getSourcePath,
  };
})();

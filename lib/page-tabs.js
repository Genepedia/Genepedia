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

  const PEOPLE_PROFILE_RELATIVE_FILES = [
    'profile.html',
    'data/profile.html',
    'data/profile-table.html',
    'data/media.html',
    'data/tree.html',
    'data/talk.json',
    'data/family-tree.ged',
    'data/images',
  ];

  function getPeopleProfileId() {
    const path = window.location.pathname.replace(/\\/g, '/');
    const match = path.match(/\/people\/([^/]+)\/profile\.html$/);
    return match?.[1]?.trim() || '';
  }

  function getPeopleProfileSourcePaths() {
    const personId = getPeopleProfileId();
    if (!personId) {
      return null;
    }

    const base = `people/${personId}`;
    return PEOPLE_PROFILE_RELATIVE_FILES.map((file) => `${base}/${file}`);
  }

  function normalizeSourcePaths(sourcePathOrPaths) {
    if (Array.isArray(sourcePathOrPaths)) {
      return sourcePathOrPaths
        .map((path) => String(path || '').replace(/^\/+/, '').trim())
        .filter(Boolean);
    }

    const raw = String(sourcePathOrPaths || '').replace(/^\/+/, '').trim();
    if (!raw) {
      return [];
    }

    if (raw.includes(',')) {
      return raw
        .split(',')
        .map((path) => path.trim())
        .filter(Boolean);
    }

    return [raw];
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

  function getSourcePaths() {
    const profilePaths = getPeopleProfileSourcePaths();
    if (profilePaths?.length) {
      return profilePaths;
    }

    const single = getSourcePath();
    return single ? [single] : [];
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

  function resolveGitHubApiBase() {
    return String(
      window.App?.getGitHubApiBase?.()
      || window.App?.GitHubApiBase
      || '',
    ).trim().replace(/\/+$/, '');
  }

  function resolveFileCommitsApiUrl(sourcePathOrPaths) {
    const apiBase = resolveGitHubApiBase();
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    if (!apiBase || !paths.length) {
      return '';
    }

    const url = new URL('github-file-commits.php', `${apiBase}/`);
    if (paths.length === 1) {
      url.searchParams.set('path', paths[0]);
    } else {
      url.searchParams.set('paths', paths.join(','));
    }
    return url.href;
  }

  function resolveFileCommitDiffApiUrl(sourcePathOrPaths, hash) {
    const apiBase = resolveGitHubApiBase();
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    if (!apiBase || !paths.length) {
      return '';
    }

    const url = new URL('github-file-commit-diff.php', `${apiBase}/`);
    if (paths.length === 1) {
      url.searchParams.set('path', paths[0]);
    } else {
      url.searchParams.set('paths', paths.join(','));
    }
    url.searchParams.set('hash', hash);
    return url.href;
  }

  async function fetchFileCommitsFromApi(sourcePathOrPaths) {
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    const url = resolveFileCommitsApiUrl(paths);

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
      paths: Array.isArray(payload.paths) ? payload.paths : paths,
    };
  }

  async function fetchFileCommitDiff(sourcePathOrPaths, hash) {
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    const url = resolveFileCommitDiffApiUrl(paths, hash);
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
      const message = payload?.message || `Failed to load file changes (${response.status})`;
      const requestError = new Error(message);
      requestError.status = response.status;
      throw requestError;
    }

    if (Array.isArray(payload.diffs) && payload.diffs.length) {
      return payload.diffs;
    }

    if (payload.diff) {
      return [payload.diff];
    }

    throw new Error('No file changes were returned for this commit.');
  }

  function resolvePullRequestsApiUrl(sourcePathOrPaths) {
    const apiBase = resolveGitHubApiBase();
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    if (!apiBase || !paths.length) {
      return '';
    }

    const url = new URL('github-pull-requests.php', `${apiBase}/`);
    if (paths.length === 1) {
      url.searchParams.set('path', paths[0]);
    } else {
      url.searchParams.set('paths', paths.join(','));
    }

    return url.href;
  }

  function resolvePullRequestDetailApiUrl(number) {
    const apiBase = resolveGitHubApiBase();
    if (!apiBase || !number) {
      return '';
    }

    const url = new URL('github-pull-requests.php', `${apiBase}/`);
    url.searchParams.set('number', String(number));
    return url.href;
  }

  function resolvePullRequestReviewApiUrl() {
    const apiBase = resolveGitHubApiBase();
    if (!apiBase) {
      return '';
    }

    return new URL('github-pull-request-review.php', `${apiBase}/`).href;
  }

  async function fetchPendingPullRequests(sourcePathOrPaths) {
    const url = resolvePullRequestsApiUrl(sourcePathOrPaths);
    if (!url) {
      return {
        pull_requests: [],
        can_review: false,
        review_login: '',
      };
    }

    const response = await fetch(
      url,
      window.App?.getGitHubFetchInit?.() || { credentials: 'include' },
    );
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || `Failed to load pending edits (${response.status})`);
    }

    return payload;
  }

  async function fetchPullRequestDetail(number) {
    const url = resolvePullRequestDetailApiUrl(number);
    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const response = await fetch(
      url,
      window.App?.getGitHubFetchInit?.() || { credentials: 'include' },
    );
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || `Failed to load pull request #${number}`);
    }

    return payload;
  }

  async function submitPullRequestReview(number, action) {
    const url = resolvePullRequestReviewApiUrl();
    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const response = await fetch(url, window.App?.getGitHubFetchInit?.({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number, action }),
    }) || {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number, action }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || `Failed to ${action} pull request #${number}`);
    }

    return payload;
  }

  function renderPendingReviewActions(number, canReview) {
    if (!canReview) {
      return '';
    }

    return `
      <div class="page-changes__pending-actions">
        <button type="button" class="page-changes__pending-button page-changes__pending-button--approve" data-pr-action="merge" data-pr-number="${number}">
          <i class="bi bi-check2-circle" aria-hidden="true"></i>
          <span>Approve &amp; merge</span>
        </button>
        <button type="button" class="page-changes__pending-button page-changes__pending-button--decline" data-pr-action="decline" data-pr-number="${number}">
          <i class="bi bi-x-circle" aria-hidden="true"></i>
          <span>Decline</span>
        </button>
      </div>
    `;
  }

  function renderPendingPullRequestRow(pullRequest, canReview) {
    const author = pullRequest?.user || {};
    const authorLabel = author.displayName || author.login || 'Unknown author';
    const githubUrl = pullRequest?.url || '';
    const stats = pullRequest?.changed_files
      ? `<span class="page-changes__pending-stats">${pullRequest.changed_files} file(s), +${pullRequest.additions} / −${pullRequest.deletions}</span>`
      : '';

    return `
      <li class="page-changes__pending-item">
        <details class="page-changes__details page-changes__pending-details" data-pr-number="${pullRequest.number}">
          <summary class="page-changes__pending-summary">
            <span class="page-changes__pending-title">
              <span class="page-changes__pending-number">#${escapeHtml(String(pullRequest.number))}</span>
              <span class="page-changes__pending-subject">${escapeHtml(pullRequest.title || 'Untitled change')}</span>
            </span>
            <span class="page-changes__pending-meta">
              <span>${escapeHtml(authorLabel)}</span>
              <span>${escapeHtml(formatCommitDate(pullRequest.updated_at || pullRequest.created_at))}</span>
              ${stats}
            </span>
          </summary>
          <div class="page-changes__pending-body">
            <p class="page-changes__hint">
              Proposed page edit waiting for review.
              ${githubUrl ? `<a href="${escapeHtml(githubUrl)}" target="_blank" rel="noopener noreferrer">View on GitHub</a>` : ''}
            </p>
            <div class="page-changes__diff-panel page-changes__pending-diff-panel" data-loaded="false"></div>
            ${renderPendingReviewActions(pullRequest.number, canReview)}
          </div>
        </details>
      </li>
    `;
  }

  function renderPendingEditsSection(pendingPayload) {
    const pullRequests = Array.isArray(pendingPayload?.pull_requests)
      ? pendingPayload.pull_requests
      : [];
    if (!pullRequests.length) {
      return '';
    }

    const canReview = Boolean(pendingPayload?.can_review);
    const intro = canReview
      ? '<p class="page-changes__hint">These edits are not merged yet. Only you can approve or decline them.</p>'
      : `<p class="page-changes__hint">These edits are waiting for review by ${escapeHtml(pendingPayload?.review_login || 'the site reviewer')}.</p>`;

    return `
      <section class="page-changes__pending" aria-label="Pending edits">
        <h2 class="page-changes__pending-heading">Pending edits</h2>
        ${intro}
        <ol class="page-changes__pending-list">
          ${pullRequests.map((pullRequest) => renderPendingPullRequestRow(pullRequest, canReview)).join('')}
        </ol>
      </section>
    `;
  }

  const HIGHLIGHT_JS_BASE = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build';
  let highlightJsPromise = null;

  function isDarkThemeActive() {
    return document.body?.classList.contains('theme-dark');
  }

  function getHighlightThemeUrl() {
    return isDarkThemeActive()
      ? `${HIGHLIGHT_JS_BASE}/styles/github-dark.min.css`
      : `${HIGHLIGHT_JS_BASE}/styles/github.min.css`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', reject, { once: true });
        if (existing.dataset.loaded === 'true') {
          resolve();
        }
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  function ensureHighlightStylesheet() {
    const href = getHighlightThemeUrl();
    let link = document.getElementById('page-changes-hljs-theme');
    if (!link) {
      link = document.createElement('link');
      link.id = 'page-changes-hljs-theme';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.getAttribute('href') !== href) {
      link.setAttribute('href', href);
    }
  }

  function ensureHighlightJs() {
    if (window.hljs?.highlight) {
      ensureHighlightStylesheet();
      return Promise.resolve(window.hljs);
    }

    if (!highlightJsPromise) {
      highlightJsPromise = loadScript(`${HIGHLIGHT_JS_BASE}/highlight.min.js`)
        .then(() => loadScript(`${HIGHLIGHT_JS_BASE}/languages/xml.min.js`))
        .then(() => loadScript(`${HIGHLIGHT_JS_BASE}/languages/javascript.min.js`))
        .then(() => loadScript(`${HIGHLIGHT_JS_BASE}/languages/css.min.js`))
        .then(() => loadScript(`${HIGHLIGHT_JS_BASE}/languages/json.min.js`))
        .then(() => {
          ensureHighlightStylesheet();
          return window.hljs;
        })
        .catch((error) => {
          highlightJsPromise = null;
          throw error;
        });
    }

    return highlightJsPromise;
  }

  function getLanguageFromPath(filePath) {
    const path = String(filePath || '').toLowerCase();
    if (path.endsWith('.html') || path.endsWith('.htm')) {
      return 'xml';
    }
    if (path.endsWith('.css')) {
      return 'css';
    }
    if (path.endsWith('.js') || path.endsWith('.mjs')) {
      return 'javascript';
    }
    if (path.endsWith('.json')) {
      return 'json';
    }
    return 'plaintext';
  }

  function highlightCodeLine(text, language) {
    const value = String(text ?? '');
    if (!value) {
      return '&nbsp;';
    }

    if (!window.hljs?.highlight) {
      return escapeHtml(value);
    }

    try {
      if (language !== 'plaintext' && window.hljs.getLanguage(language)) {
        return window.hljs.highlight(value, { language }).value;
      }
    } catch (error) {
      // fall through to escaped text
    }

    return escapeHtml(value);
  }

  function emptyDiffCell() {
    return { line: '', text: '', change: 'empty' };
  }

  function parseUnifiedPatch(patch) {
    const hunks = [];
    let current = null;

    for (const rawLine of String(patch || '').split('\n')) {
      if (rawLine.startsWith('@@')) {
        const match = rawLine.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (match) {
          current = {
            oldStart: Number(match[1]),
            newStart: Number(match[3]),
            lines: [],
          };
          hunks.push(current);
        }
        continue;
      }

      if (!current || rawLine.startsWith('+++') || rawLine.startsWith('---')) {
        continue;
      }

      if (rawLine === '\\ No newline at end of file') {
        continue;
      }

      const prefix = rawLine[0];
      if (prefix === ' ' || prefix === '-' || prefix === '+') {
        current.lines.push({
          type: prefix === ' ' ? 'context' : prefix === '-' ? 'delete' : 'add',
          text: rawLine.slice(1),
        });
      }
    }

    return hunks;
  }

  function rowsFromHunk(hunk) {
    const rows = [];
    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;

    for (let index = 0; index < hunk.lines.length; index += 1) {
      const line = hunk.lines[index];

      if (line.type === 'context') {
        rows.push({
          before: { line: oldLine, text: line.text, change: 'context' },
          after: { line: newLine, text: line.text, change: 'context' },
        });
        oldLine += 1;
        newLine += 1;
        continue;
      }

      if (line.type === 'delete') {
        const dels = [];
        const adds = [];
        let cursor = index;

        while (cursor < hunk.lines.length && hunk.lines[cursor].type === 'delete') {
          dels.push({
            line: oldLine,
            text: hunk.lines[cursor].text,
            change: 'delete',
          });
          oldLine += 1;
          cursor += 1;
        }

        while (cursor < hunk.lines.length && hunk.lines[cursor].type === 'add') {
          adds.push({
            line: newLine,
            text: hunk.lines[cursor].text,
            change: 'add',
          });
          newLine += 1;
          cursor += 1;
        }

        const count = Math.max(dels.length, adds.length, 1);
        for (let offset = 0; offset < count; offset += 1) {
          rows.push({
            before: dels[offset] || emptyDiffCell(),
            after: adds[offset] || emptyDiffCell(),
          });
        }

        index = cursor - 1;
        continue;
      }

      if (line.type === 'add') {
        rows.push({
          before: emptyDiffCell(),
          after: { line: newLine, text: line.text, change: 'add' },
        });
        newLine += 1;
      }
    }

    return rows;
  }

  function diffLinesFallback(beforeText, afterText) {
    const beforeLines = String(beforeText || '').split('\n');
    const afterLines = String(afterText || '').split('\n');
    const rowCount = beforeLines.length;
    const colCount = afterLines.length;

    if (rowCount * colCount > 250000) {
      return [];
    }

    const lcs = Array.from({ length: rowCount + 1 }, () => Array(colCount + 1).fill(0));
    for (let i = rowCount - 1; i >= 0; i -= 1) {
      for (let j = colCount - 1; j >= 0; j -= 1) {
        if (beforeLines[i] === afterLines[j]) {
          lcs[i][j] = lcs[i + 1][j + 1] + 1;
        } else {
          lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
      }
    }

    const rows = [];
    let i = 0;
    let j = 0;
    let oldLine = 1;
    let newLine = 1;

    while (i < rowCount && j < colCount) {
      if (beforeLines[i] === afterLines[j]) {
        rows.push({
          before: { line: oldLine, text: beforeLines[i], change: 'context' },
          after: { line: newLine, text: afterLines[j], change: 'context' },
        });
        i += 1;
        j += 1;
        oldLine += 1;
        newLine += 1;
      } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
        rows.push({
          before: { line: oldLine, text: beforeLines[i], change: 'delete' },
          after: emptyDiffCell(),
        });
        i += 1;
        oldLine += 1;
      } else {
        rows.push({
          before: emptyDiffCell(),
          after: { line: newLine, text: afterLines[j], change: 'add' },
        });
        j += 1;
        newLine += 1;
      }
    }

    while (i < rowCount) {
      rows.push({
        before: { line: oldLine, text: beforeLines[i], change: 'delete' },
        after: emptyDiffCell(),
      });
      i += 1;
      oldLine += 1;
    }

    while (j < colCount) {
      rows.push({
        before: emptyDiffCell(),
        after: { line: newLine, text: afterLines[j], change: 'add' },
      });
      j += 1;
      newLine += 1;
    }

    return rows;
  }

  function rowsFromSingleSide(text, side, change) {
    return String(text || '').split('\n').map((line, index) => ({
      before: side === 'before'
        ? { line: index + 1, text: line, change }
        : emptyDiffCell(),
      after: side === 'after'
        ? { line: index + 1, text: line, change }
        : emptyDiffCell(),
    }));
  }

  function buildSideBySideRows(diff) {
    const hunks = parseUnifiedPatch(diff?.patch);
    if (hunks.length > 0) {
      return hunks.flatMap((hunk) => rowsFromHunk(hunk));
    }

    if (diff?.before && diff?.after) {
      return diffLinesFallback(diff.before, diff.after);
    }

    if (diff?.after) {
      return rowsFromSingleSide(diff.after, 'after', 'add');
    }

    if (diff?.before) {
      return rowsFromSingleSide(diff.before, 'before', 'delete');
    }

    return [];
  }

  function renderDiffCell(side, cell, language) {
    const change = cell?.change || 'context';
    const lineNumber = cell?.line ? String(cell.line) : '';

    if (change === 'empty') {
      return `
        <div class="page-changes__diff-cell is-${side} is-empty" aria-hidden="true">
          <span class="page-changes__diff-lno"></span>
          <pre class="page-changes__diff-line"><code>&nbsp;</code></pre>
        </div>
      `;
    }

    const highlighted = highlightCodeLine(cell.text, language);

    return `
      <div class="page-changes__diff-cell is-${side} is-${change}">
        <span class="page-changes__diff-lno">${escapeHtml(lineNumber)}</span>
        <pre class="page-changes__diff-line"><code class="hljs language-${escapeHtml(language)}">${highlighted}</code></pre>
      </div>
    `;
  }

  function renderSideBySideDiff(diff, filePath) {
    const language = getLanguageFromPath(filePath || diff?.path);
    const rows = buildSideBySideRows(diff);

    if (!rows.length) {
      return '<p class="page-changes__diff-empty">No line changes are available for this commit.</p>';
    }

    const body = rows.map((row) => `
      <div class="page-changes__diff-row">
        ${renderDiffCell('before', row.before, language)}
        ${renderDiffCell('after', row.after, language)}
      </div>
    `).join('');

    return `
      <div class="page-changes__diff-sidebyside">
        <div class="page-changes__diff-columns">
          <div class="page-changes__diff-column-label">Before</div>
          <div class="page-changes__diff-column-label">After</div>
        </div>
        <div class="page-changes__diff-rows">${body}</div>
      </div>
    `;
  }

  function renderUnifiedDiff(patch) {
    if (!patch) {
      return '<p class="page-changes__diff-empty">No unified diff is available for this change.</p>';
    }

    const lines = String(patch).split('\n').map((line) => {
      let className = 'page-changes__diff-unified-line';
      if (line.startsWith('+++') || line.startsWith('---')) {
        className += ' is-meta';
      } else if (line.startsWith('@@')) {
        className += ' is-hunk';
      } else if (line.startsWith('+')) {
        className += ' is-add';
      } else if (line.startsWith('-')) {
        className += ' is-del';
      }

      return `<div class="${className}">${escapeHtml(line)}</div>`;
    }).join('');

    return `<div class="page-changes__diff-unified">${lines}</div>`;
  }

  function renderDiffPanel(diff, filePath) {
    const additions = Number(diff?.additions || 0);
    const deletions = Number(diff?.deletions || 0);
    const status = escapeHtml(diff?.status || 'modified');
    const path = String(filePath || diff?.path || '');

    return `
      <div class="page-changes__diff">
        <div class="page-changes__diff-toolbar">
          <span class="page-changes__diff-status">${status}</span>
          <span class="page-changes__diff-stats">
            <span class="page-changes__diff-add">+${additions}</span>
            <span class="page-changes__diff-del">−${deletions}</span>
          </span>
        </div>
        <div class="page-changes__diff-views">
          <details class="page-changes__diff-view" open>
            <summary>Before and after</summary>
            ${renderSideBySideDiff(diff, path)}
          </details>
          <details class="page-changes__diff-view">
            <summary>Unified diff</summary>
            ${renderUnifiedDiff(diff?.patch)}
          </details>
        </div>
      </div>
    `;
  }

  function renderDiffPanels(diffs, sourcePathOrPaths) {
    const items = Array.isArray(diffs) ? diffs : [diffs];
    if (items.length === 1) {
      const diff = items[0];
      return renderDiffPanel(diff, diff?.path || normalizeSourcePaths(sourcePathOrPaths)[0] || '');
    }

    return items.map((diff) => `
      <section class="page-changes__file-diff">
        <h3 class="page-changes__file-diff-title"><code>${escapeHtml(diff?.path || '')}</code></h3>
        ${renderDiffPanel(diff, diff?.path || '')}
      </section>
    `).join('');
  }

  function bindChangesView(main, sourcePathOrPaths, onPendingReviewComplete = () => {}) {
    const diffCache = new Map();
    const prDiffCache = new Map();

    main.addEventListener('toggle', async (event) => {
      const details = event.target.closest?.('.page-changes__details');
      if (!details || event.target !== details || !details.open) {
        return;
      }

      const prNumber = Number(details.dataset.prNumber || 0);
      const panel = details.querySelector('.page-changes__diff-panel');
      if (!panel || panel.dataset.loaded === 'true' || panel.dataset.loaded === 'loading') {
        return;
      }

      if (prNumber > 0) {
        panel.dataset.loaded = 'loading';
        panel.innerHTML = '<p class="page-changes__status">Loading file changes…</p>';

        try {
          let diffs = prDiffCache.get(prNumber);
          if (!diffs) {
            const payload = await fetchPullRequestDetail(prNumber);
            diffs = Array.isArray(payload.diffs) ? payload.diffs : [];
            prDiffCache.set(prNumber, diffs);
          }

          await ensureHighlightJs();
          panel.innerHTML = renderDiffPanels(diffs, sourcePathOrPaths);
          panel.dataset.loaded = 'true';
        } catch (error) {
          panel.dataset.loaded = 'false';
          const message = error?.message || 'Could not load file changes.';
          panel.innerHTML = `<p class="page-changes__status">${escapeHtml(message)}</p>`;
        }

        return;
      }

      const hash = details.dataset.commitHash || '';
      const commitPaths = normalizeSourcePaths(
        details.dataset.commitPaths || sourcePathOrPaths,
      );
      if (!hash) {
        return;
      }

      panel.dataset.loaded = 'loading';
      panel.innerHTML = '<p class="page-changes__status">Loading file changes…</p>';

      try {
        const cacheKey = `${hash}:${commitPaths.join('|')}`;
        let diffs = diffCache.get(cacheKey);
        if (!diffs) {
          diffs = await fetchFileCommitDiff(commitPaths, hash);
          diffCache.set(cacheKey, diffs);
        }

        await ensureHighlightJs();
        panel.innerHTML = renderDiffPanels(diffs, commitPaths);
        panel.dataset.loaded = 'true';
      } catch (error) {
        panel.dataset.loaded = 'false';
        const message = error?.message || 'Could not load file changes.';
        panel.innerHTML = `<p class="page-changes__status">${escapeHtml(message)}</p>`;
      }
    }, true);

    main.addEventListener('click', async (event) => {
      const button = event.target.closest?.('[data-pr-action]');
      if (!button || !main.contains(button)) {
        return;
      }

      event.preventDefault();
      const number = Number(button.dataset.prNumber || 0);
      const action = button.dataset.prAction || '';
      if (!number || !action) {
        return;
      }

      const verb = action === 'merge' ? 'approve and merge' : 'decline';
      if (!window.confirm(`Are you sure you want to ${verb} pull request #${number}?`)) {
        return;
      }

      const buttons = main.querySelectorAll('[data-pr-action]');
      buttons.forEach((item) => {
        item.disabled = true;
      });

      try {
        await submitPullRequestReview(number, action);
        prDiffCache.delete(number);
        await onPendingReviewComplete();
      } catch (error) {
        window.alert(error?.message || `Could not ${verb} this pull request.`);
        buttons.forEach((item) => {
          item.disabled = false;
        });
      }
    });
  }

  function commitSearchText(commit) {
    return [
      commit?.subject,
      commit?.author,
      commit?.author_login,
      commit?.hash,
      commit?.hash ? commit.hash.slice(0, 7) : '',
      commit?.date,
      formatCommitDate(commit?.date),
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function filterCommits(commits, query) {
    const needle = String(query || '').trim().toLowerCase();
    if (!needle) {
      return commits;
    }

    return commits.filter((commit) => commitSearchText(commit).includes(needle));
  }

  function getChangesSearchMetaText(shownCount, totalCount, query) {
    const filter = String(query || '').trim();
    if (!filter) {
      return `${totalCount} commit${totalCount === 1 ? '' : 's'}`;
    }

    if (shownCount === 0) {
      return `No commits match “${filter}”`;
    }

    return `Showing ${shownCount} of ${totalCount} commit${totalCount === 1 ? '' : 's'}`;
  }

  function getCommitLinkUrl(commit, sourcePathOrPaths, repo) {
    const hash = String(commit?.hash || '').trim();
    const paths = Array.isArray(commit?.paths) && commit.paths.length
      ? commit.paths
      : normalizeSourcePaths(sourcePathOrPaths);

    if (paths.length === 1) {
      return getGitHubFileUrl(hash, paths[0], repo);
    }

    if (paths.length > 1) {
      return getGitHubCommitUrl(hash, repo);
    }

    return getGitHubCommitUrl(hash, repo);
  }

  function renderCommitPaths(commit, sourcePathOrPaths) {
    const paths = Array.isArray(commit?.paths) && commit.paths.length
      ? commit.paths
      : normalizeSourcePaths(sourcePathOrPaths);

    if (paths.length <= 1) {
      return '';
    }

    const labels = paths.map((path) => {
      const shortPath = path.replace(/^people\/[^/]+\//, '');
      return `<code class="page-changes__path">${escapeHtml(shortPath)}</code>`;
    }).join(' ');

    return `<div class="page-changes__paths">${labels}</div>`;
  }

  function renderCommitRow(commit, sourcePathOrPaths, repo) {
    const hash = String(commit.hash || '');
    const fileUrl = escapeHtml(getCommitLinkUrl(commit, sourcePathOrPaths, repo));
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

    const commitPaths = Array.isArray(commit?.paths) && commit.paths.length
      ? commit.paths
      : normalizeSourcePaths(sourcePathOrPaths);

    return `
      <li class="page-changes__item">
        <a class="page-changes__subject" href="${fileUrl}" target="_blank" rel="noopener noreferrer">${subject}</a>
        ${renderCommitPaths(commit, sourcePathOrPaths)}
        <div class="page-changes__meta">
          <span class="page-changes__date">${date}</span>
          ${authorMarkup}
          ${hashMarkup}
        </div>
        <details
          class="page-changes__details"
          data-commit-hash="${escapeHtml(hash)}"
          data-commit-paths="${escapeHtml(commitPaths.join(','))}"
        >
          <summary class="page-changes__toggle">Show file changes</summary>
          <div class="page-changes__diff-panel" data-loaded="false"></div>
        </details>
      </li>
    `;
  }

  function renderCommitList(commits, sourcePathOrPaths, repo) {
    return `
      <ol class="page-changes__list">
        ${commits.map((commit) => renderCommitRow(commit, sourcePathOrPaths, repo)).join('')}
      </ol>
    `;
  }

  function renderChangesResults(commits, sourcePathOrPaths, repo, query) {
    if (!commits.length) {
      const filter = escapeHtml(String(query || '').trim());
      return `
        <p class="page-changes__status">
          No commits match <code>${filter || 'your search'}</code>.
        </p>
      `;
    }

    return renderCommitList(commits, sourcePathOrPaths, repo);
  }

  function renderChangesPathSummary(sourcePathOrPaths) {
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    if (paths.length <= 1) {
      return `<code>${escapeHtml(paths[0] || '')}</code>`;
    }

    return paths.map((path) => `<code>${escapeHtml(path)}</code>`).join(', ');
  }

  function renderChangesView(commits, sourcePathOrPaths, repo, query = '', pendingPayload = null) {
    const filter = String(query || '');
    const pendingSection = renderPendingEditsSection(pendingPayload);
    const hasCommits = Array.isArray(commits) && commits.length > 0;

    if (!hasCommits && !pendingSection) {
      return `
        <div class="page-changes">
          <p class="page-changes__status">No commit history was found for ${renderChangesPathSummary(sourcePathOrPaths)}.</p>
        </div>
      `;
    }

    const historySection = hasCommits ? (() => {
      const filteredCommits = filterCommits(commits, filter);
      const searchMeta = escapeHtml(getChangesSearchMetaText(filteredCommits.length, commits.length, filter));

      return `
        <section class="page-changes__history" aria-label="Merged change history">
          <h2 class="page-changes__history-heading">Merged history</h2>
          <div class="page-changes__search">
            <label class="screen-reader-text" for="page-changes-search">Filter changes</label>
            <input
              type="search"
              id="page-changes-search"
              class="page-changes__search-input"
              placeholder="Search by message, author, or commit…"
              value="${escapeHtml(filter)}"
              autocomplete="off"
              enterkeyhint="search"
            />
            <p class="page-changes__search-meta" aria-live="polite">${searchMeta}</p>
          </div>
          <div class="page-changes__results">
            ${renderChangesResults(filteredCommits, sourcePathOrPaths, repo, filter)}
          </div>
        </section>
      `;
    })() : `
      <section class="page-changes__history" aria-label="Merged change history">
        <h2 class="page-changes__history-heading">Merged history</h2>
        <p class="page-changes__status">No merged commit history was found for ${renderChangesPathSummary(sourcePathOrPaths)}.</p>
      </section>
    `;

    return `
      <section class="page-changes" aria-label="Changes">
        ${pendingSection}
        ${historySection}
      </section>
    `;
  }

  function bindChangesSearch(main, getChangesData, setFilter) {
    main.addEventListener('input', (event) => {
      const input = event.target.closest?.('.page-changes__search-input');
      if (!input || !main.contains(input)) {
        return;
      }

      const data = getChangesData();
      if (!data) {
        return;
      }

      const filter = input.value;
      setFilter(filter);

      const section = input.closest('.page-changes');
      const results = section?.querySelector('.page-changes__results');
      const meta = section?.querySelector('.page-changes__search-meta');
      const filteredCommits = filterCommits(data.commits, filter);

      if (results) {
        results.innerHTML = renderChangesResults(
          filteredCommits,
          data.sourcePaths || data.sourcePath,
          data.repo,
          filter,
        );
      }

      if (meta) {
        meta.textContent = getChangesSearchMetaText(filteredCommits.length, data.commits.length, filter);
      }
    });
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

  function mountChangesView(container, sourcePathOrPaths, {
    filter = '',
    onFilterChange = () => {},
    getChangesData = null,
  } = {}) {
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    if (!container || !paths.length) {
      return Promise.resolve();
    }

    let historyDatasetPromise = null;
    let pendingDatasetPromise = null;
    let changesData = getChangesData?.() || null;
    let changesFilter = filter;

    const loadHistory = () => {
      if (!historyDatasetPromise) {
        historyDatasetPromise = fetchFileCommitsFromApi(paths);
      }

      return historyDatasetPromise;
    };

    const loadPending = () => {
      if (!pendingDatasetPromise) {
        pendingDatasetPromise = fetchPendingPullRequests(paths).catch((error) => {
          console.error(error);
          return {
            pull_requests: [],
            can_review: false,
            review_login: '',
            error: error?.message || 'Could not load pending edits.',
          };
        });
      }

      return pendingDatasetPromise;
    };

    const renderLoadedChanges = ([history, pending]) => {
      const sourcePaths = history.paths?.length ? history.paths : paths;
      changesData = {
        commits: history.commits,
        repo: history.repo,
        sourcePath: sourcePaths[0],
        sourcePaths,
        pending,
      };
      container.innerHTML = renderChangesView(
        history.commits,
        sourcePaths,
        history.repo,
        changesFilter,
        pending,
      );

      if (pending?.error) {
        const pendingSection = container.querySelector('.page-changes__pending');
        if (pendingSection) {
          pendingSection.insertAdjacentHTML(
            'beforeend',
            `<p class="page-changes__status">${escapeHtml(pending.error)}</p>`,
          );
        }
      }
    };

    const reloadChanges = () => {
      historyDatasetPromise = null;
      pendingDatasetPromise = null;
      container.classList.add('is-changes-view');
      container.setAttribute('aria-busy', 'true');
      container.innerHTML = '<p class="page-changes__status">Loading changes…</p>';

      return Promise.all([loadHistory(), loadPending()])
        .then(renderLoadedChanges)
        .catch((error) => {
          console.error(error);
          const message = error?.message || 'Could not load changes. Please try again.';
          container.innerHTML = `<p class="page-changes__status">${escapeHtml(message)}</p>`;
        })
        .finally(() => {
          container.removeAttribute('aria-busy');
        });
    };

    if (container.dataset.changesBound !== 'true') {
      bindChangesView(container, paths, () => reloadChanges());
      bindChangesSearch(container, () => changesData, (value) => {
        changesFilter = value;
        onFilterChange(value);
      });
      container.dataset.changesBound = 'true';
    }

    container.classList.add('is-changes-view');
    return reloadChanges();
  }

  function resolvePageTabsScriptUrl() {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i]?.src || '';
      if (src.includes('page-tabs.js')) {
        return src;
      }
    }

    return new URL('lib/page-tabs.js', window.location.href).href;
  }

  function ensurePageTabsLoaded() {
    if (window.AppPageTabs?.mountChangesView) {
      return Promise.resolve(window.AppPageTabs);
    }

    if (document.querySelector('script[src*="page-tabs.js"]')) {
      return new Promise((resolve) => {
        const check = () => {
          if (window.AppPageTabs?.mountChangesView) {
            resolve(window.AppPageTabs);
            return;
          }

          window.setTimeout(check, 25);
        };
        check();
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = resolvePageTabsScriptUrl();
      script.async = true;
      script.addEventListener('load', () => resolve(window.AppPageTabs), { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.append(script);
    });
  }

  function initPageTabs() {
    const toolbar = document.querySelector('full-page-toolbar[variant="page"]');
    const main = document.querySelector('article > main.main-content');

    if (!toolbar || !main || main.dataset.pageTabsBound === 'true') {
      return;
    }

    main.dataset.pageTabsBound = 'true';

    const pageHtml = main.innerHTML;
    const sourcePaths = getSourcePaths();
    let changesFilter = '';

    const render = async () => {
      const tab = getSelectedTab();

      if (tab === 'page') {
        main.innerHTML = pageHtml;
        main.classList.remove('is-changes-view');
        main.removeAttribute('aria-busy');
        return;
      }

      await mountChangesView(main, sourcePaths, {
        filter: changesFilter,
        onFilterChange: (value) => {
          changesFilter = value;
        },
      });
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
    getSourcePaths,
    getPeopleProfileSourcePaths,
    mountChangesView,
    ensurePageTabsLoaded,
    renderDiffPanels,
    ensureHighlightJs,
  };
})();

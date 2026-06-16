/**
 * Convert Geni "{geni:about_me}" GEDCOM notes into clean, SEO-friendly HTML.
 *
 * Handles the wiki-ish markup Geni exports use:
 *   '''label'''            -> heading / strong timeline label
 *   ''text''               -> emphasis
 *   * item                 -> unordered list item
 *   [https://url label]    -> anchor
 *   bare https://url       -> anchor
 *   ----                   -> horizontal rule
 *   blank line             -> paragraph break
 *
 * Geni person links (geni.com/people/<name>/<geniId>) are rewritten to local
 * Genepedia profile routes when the importer can resolve the target person.
 * Email addresses are always redacted from generated prose.
 */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripGeniMarker(raw) {
  return String(raw || '').replace(/^\s*\{geni:[^}]*\}\s*/, '');
}

function defaultRewriteLink(url) {
  return url;
}

function anchor(href, text) {
  const external = /^https?:/i.test(href);
  const rel = external ? ' target="_blank" rel="noopener noreferrer nofollow"' : '';
  return `<a href="${escapeHtml(href)}"${rel}>${escapeHtml(text)}</a>`;
}

function inlineFormat(raw, rewriteLink) {
  const tokens = [];
  let s = String(raw || '').replace(EMAIL_RE, '');

  // Bracketed links: [https://url optional label]
  s = s.replace(/\[(https?:\/\/[^\s\]]+)(?:\s+([^\]]*))?\]/g, (_match, url, label) => {
    const href = rewriteLink(url);
    const text = label && label.trim() ? label.trim() : url;
    const index = tokens.push(anchor(href, text)) - 1;
    return `\u0000${index}\u0000`;
  });

  // Bare URLs
  s = s.replace(/(https?:\/\/[^\s<>()\]]+[^\s<>().,;\]])/g, (_match, url) => {
    const href = rewriteLink(url);
    const index = tokens.push(anchor(href, url)) - 1;
    return `\u0000${index}\u0000`;
  });

  s = escapeHtml(s);
  s = s.replace(/'''([^']+?)'''/g, '<strong>$1</strong>');
  s = s.replace(/''([^']+?)''/g, '<em>$1</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_match, index) => tokens[Number(index)]);
  return s.trim();
}

export function aboutMeToHtml(rawNote, options = {}) {
  const rewriteLink = options.rewriteLink || defaultRewriteLink;
  const text = stripGeniMarker(rawNote);
  if (!text.trim()) {
    return '';
  }

  const lines = text.split('\n');
  const out = [];
  let paragraph = [];
  let listOpen = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${paragraph.join(' ')}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listOpen) {
      out.push('</ul>');
      listOpen = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }
    if (/^-{3,}$/.test(trimmed)) {
      flushParagraph();
      closeList();
      out.push('<hr>');
      continue;
    }

    const heading = trimmed.match(/^'''(.+?)'''$/);
    if (heading) {
      flushParagraph();
      closeList();
      out.push(`<h3 class="profile-prose__heading">${inlineFormat(heading[1], rewriteLink)}</h3>`);
      continue;
    }

    const listItem = trimmed.match(/^\*+\s*(.*)$/);
    if (listItem) {
      flushParagraph();
      if (!listOpen) {
        out.push('<ul>');
        listOpen = true;
      }
      out.push(`<li>${inlineFormat(listItem[1], rewriteLink)}</li>`);
      continue;
    }

    closeList();
    const formatted = inlineFormat(trimmed, rewriteLink);
    if (formatted) {
      paragraph.push(formatted);
    }
  }

  flushParagraph();
  closeList();
  return out.join('\n');
}

/** Plain-text summary (for meta descriptions) from a generated prose HTML block. */
export function htmlToPlainText(html, maxLength = 160) {
  const text = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}…`;
}

/** Parse Geni property notes like "{geni:hair_color} Brown" into a key/value map. */
export function parseGeniProps(noteValues) {
  const props = {};
  for (const value of noteValues) {
    const match = String(value || '').match(/^\s*\{geni:([a-z0-9_]+)\}\s*([\s\S]*)$/i);
    if (!match) {
      continue;
    }
    const key = match[1].toLowerCase();
    const text = match[2].trim();
    if (key === 'about_me' || !text) {
      continue;
    }
    props[key] = text;
  }
  return props;
}

/**
 * Render the static, SEO-friendly files that make up a person's profile folder.
 *
 * Output per person (people/<id>/):
 *   index.html              - canonical profile page (pre-rendered SEO head + <people-page>)
 *   profile.html            - legacy redirect stub -> ./ (back-compat + canonical)
 *   profile.json            - ownership/claim metadata
 *   data/profile.html       - authored narrative prose (about_me)
 *   data/profile-table.html - identity infobox fragment
 *   data/media.html         - media gallery fragment
 *   data/tree.html          - tree tab fragment
 *   data/family-tree.ged    - immediate-family neighborhood GEDCOM
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function lifespan(birthYear, deathYear) {
  if (birthYear && deathYear) {
    return `${birthYear}–${deathYear}`;
  }
  if (birthYear) {
    return `b. ${birthYear}`;
  }
  if (deathYear) {
    return `d. ${deathYear}`;
  }
  return '';
}

const ROLE_WORDS = {
  parent: { male: 'Son', female: 'Daughter', unknown: 'Child' },
  spouse: { male: 'Husband', female: 'Wife', unknown: 'Spouse' },
  exSpouse: { male: 'Ex-husband', female: 'Ex-wife', unknown: 'Former spouse' },
  child: { male: 'Father', female: 'Mother', unknown: 'Parent' },
  sibling: { male: 'Brother', female: 'Sister', unknown: 'Sibling' },
};

function roleWord(role, sex) {
  return ROLE_WORDS[role]?.[sex] || ROLE_WORDS[role]?.unknown || '';
}

/** Render a relative profile link, or plain redacted text for private people. */
function personLink(ref) {
  if (!ref) {
    return '';
  }
  if (ref.private || !ref.id) {
    return `<span class="profile-private">private</span>`;
  }
  return `<a href="../${ref.id}/">${escapeHtml(ref.name || `Profile ${ref.id}`)}</a>`;
}

function joinPeople(refs) {
  const parts = (refs || []).map(personLink).filter(Boolean);
  if (parts.length <= 1) {
    return parts.join('');
  }
  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }
  return `${parts.slice(0, -1).join('; ')}; and ${parts[parts.length - 1]}`;
}

export function renderImmediateFamily(person, relations) {
  const lines = [];
  const sex = person.sex || 'unknown';

  if (relations.parents?.length) {
    lines.push(`<p>${roleWord('parent', sex)} of ${joinPeople(relations.parents)}</p>`);
  }
  if (relations.spouses?.length) {
    lines.push(`<p>${roleWord('spouse', sex)} of ${joinPeople(relations.spouses)}</p>`);
  }
  if (relations.exSpouses?.length) {
    lines.push(`<p>${roleWord('exSpouse', sex)} of ${joinPeople(relations.exSpouses)}</p>`);
  }
  if (relations.children?.length) {
    lines.push(`<p>${roleWord('child', sex)} of ${joinPeople(relations.children)}</p>`);
  }
  if (relations.siblings?.length) {
    lines.push(`<p>${roleWord('sibling', sex)} of ${joinPeople(relations.siblings)}</p>`);
  }
  return lines.join('\n        ');
}

export function renderProfileTableHtml({ person, imageRef, immediateFamilyHtml }) {
  const rows = [];
  if (imageRef) {
    rows.push(`    <table-photo>
        <img src="${escapeAttr(imageRef.src)}" alt="${escapeAttr(imageRef.alt)}">
    </table-photo>`);
  }
  rows.push(`    <table-name>${escapeHtml(person.names.display)}</table-name>`);

  const genderText = person.sex === 'male' ? 'Male' : person.sex === 'female' ? 'Female' : '';
  if (genderText) {
    rows.push(`    <table-gender>${genderText}</table-gender>`);
  }

  const birth = person.events.birth;
  if (birth && (birth.display || birth.place)) {
    const dateHtml = birth.display ? escapeHtml(birth.display) : '';
    const placeHtml = birth.place ? `${dateHtml ? '<br>' : ''}${escapeHtml(birth.place)}` : '';
    rows.push(`    <table-birth>${dateHtml}${placeHtml}</table-birth>`);
  }

  const death = person.events.death;
  if (death && (death.display || death.place)) {
    rows.push(`    <table-death>${escapeHtml(death.display || '')}${death.place ? `<br>${escapeHtml(death.place)}` : ''}</table-death>`);
  }

  const burial = person.events.burial;
  if (burial && burial.place) {
    rows.push(`    <table-place-of-burial>${escapeHtml(burial.place)}</table-place-of-burial>`);
  }

  if (immediateFamilyHtml) {
    rows.push(`    <table-immediate-family>
        ${immediateFamilyHtml}
    </table-immediate-family>`);
  }

  return `<!-- Profile identity table fragment (generated) -->
<profile-identity>
${rows.join('\n')}
</profile-identity>
`;
}

export function renderProfileProseHtml({ person, aboutHtml }) {
  const name = escapeHtml(person.names.display);
  const intro = aboutHtml && aboutHtml.trim()
    ? aboutHtml
    : `<p>This profile for ${name} was imported into Genepedia. Help expand this biography by adding sources, stories, and details.</p>`;

  return `<!--
  Person profile prose (editable HTML). The first <h1> is the page title.
  Structured identity (infobox, relationships, tree) is rendered from the
  Genepedia database; edit only the narrative below.
-->
<h1>${name}</h1>

${intro}
`;
}

export function renderMediaHtml({ person, gallery }) {
  const name = escapeHtml(person.names.display);
  if (!gallery || !gallery.length) {
    return `<h1>Media</h1>
<p>No photographs have been added for ${name} yet.</p>
`;
  }
  const figures = gallery.map((item) => `  <figure>
    <img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.alt || name)}">${item.caption ? `\n    <figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
  </figure>`).join('\n');
  return `<h1>Media</h1>
<p>Photographs and images from this person's life.</p>
<div class="people-page__gallery">
${figures}
</div>
`;
}

export function renderTreeHtml({ person }) {
  return `<h1>Tree</h1>
<p>Family tree for ${escapeHtml(person.names.display)}. Use the download button to export the GEDCOM.</p>
`;
}

export function renderProfileJson() {
  return `${JSON.stringify({ creator: null, owner: null, maintainers: [] }, null, 2)}\n`;
}

export function renderProfilePageHtml({ id, person, canonicalUrl, description, imageUrl, birthYear, deathYear }) {
  const name = person.names.display;
  const span = lifespan(birthYear, deathYear);
  const titleText = span ? `${name} (${span})` : name;
  const desc = description || `${name} on Genepedia — family history, relatives, biography, and sources.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url: canonicalUrl,
  };
  if (person.names.given) {
    jsonLd.givenName = person.names.given;
  }
  if (person.names.surname) {
    jsonLd.familyName = person.names.surname;
  }
  if (person.sex === 'male' || person.sex === 'female') {
    jsonLd.gender = person.sex === 'male' ? 'Male' : 'Female';
  }
  if (person.events.birth?.date) {
    jsonLd.birthDate = String(person.events.birth.year || person.events.birth.date);
  }
  if (person.events.death?.date) {
    jsonLd.deathDate = String(person.events.death.year || person.events.death.date);
  }
  if (imageUrl) {
    jsonLd.image = imageUrl;
  }

  const ogImage = imageUrl
    ? `\n	<meta property="og:image" content="${escapeAttr(imageUrl)}">
	<meta name="twitter:card" content="summary_large_image">`
    : '\n	<meta name="twitter:card" content="summary">';

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${escapeHtml(titleText)} - Genepedia</title>
	<meta name="description" content="${escapeAttr(desc)}">
	<link rel="canonical" href="${escapeAttr(canonicalUrl)}">
	<meta property="og:type" content="profile">
	<meta property="og:title" content="${escapeAttr(titleText)}">
	<meta property="og:description" content="${escapeAttr(desc)}">
	<meta property="og:url" content="${escapeAttr(canonicalUrl)}">${person.names.given ? `\n	<meta property="profile:first_name" content="${escapeAttr(person.names.given)}">` : ''}${person.names.surname ? `\n	<meta property="profile:last_name" content="${escapeAttr(person.names.surname)}">` : ''}${ogImage}
	<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
	</script>
	<script src="../../site-info.js"></script>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@latest/font/bootstrap-icons.min.css">
	<style>
		html,
		body {
			margin: 0;
		}
	</style>
	<script defer src="../../lib/Web-Framework/components/mini-header.js"></script>
	<script defer src="../../lib/Web-Framework/components/full-header.js"></script>
	<script defer src="../../components/people-page-profile-table.js"></script>
	<script defer src="../../lib/Web-Framework/components/full-page-toolbar.js"></script>
	<script defer src="../../lib/people-db.js"></script>
	<script defer src="../../components/people-page.js"></script>
	<script defer src="../../lib/Web-Framework/components/full-footer.js"></script>
</head>

<body>
	<full-header></full-header>
	<article>
		<people-page>
			<h1>${escapeHtml(name)}</h1>
			<p>${escapeHtml(desc)}</p>
			<noscript>
				<p>${escapeHtml(name)}${span ? ` (${escapeHtml(span)})` : ''} on Genepedia.
				Enable JavaScript to view the full profile, family relationships, and tree.</p>
			</noscript>
		</people-page>
		<full-footer></full-footer>
	</article>
</body>

</html>`;
}

export function renderRedirectHtml({ canonicalUrl }) {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="canonical" href="${escapeAttr(canonicalUrl)}">
	<meta http-equiv="refresh" content="0; url=./">
	<title>Redirecting…</title>
</head>
<body>
	<p>This profile has moved to <a href="./">${escapeHtml(canonicalUrl)}</a>.</p>
	<script>location.replace('./' + location.hash);</script>
</body>
</html>`;
}

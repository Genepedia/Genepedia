/**
 * Profile identity table custom elements (people-page).
 *
 * Usage:
 *   <profile-identity>
 *     <table-photo><img src="images/photo.jpg" alt="…"></table-photo>
 *     <table-name>Full name</table-name>
 *     <table-birth>July 18, 1918<br>City, Country</table-birth>
 *   </profile-identity>
 */

const PROFILE_TABLE_ROW_LABELS = {
  'table-name': 'Name',
  'table-aka': 'Also known as',
  'table-gender': 'Gender',
  'table-occupation': 'Occupation',
  'table-birth': 'Birth',
  'table-baptism': 'Baptism',
  'table-death': 'Death',
  'table-residence': 'Last residence',
  'table-place-of-burial': 'Place of burial',
  'table-immediate-family': 'Immediate family',
};

function createTableRowFromElement(doc, rowEl) {
  const tag = rowEl.tagName.toLowerCase();

  if (tag === 'table-photo') {
    const tr = doc.createElement('tr');
    const td = doc.createElement('td');
    td.colSpan = 2;
    td.append(...rowEl.childNodes);
    tr.append(td);
    return tr;
  }

  const label = PROFILE_TABLE_ROW_LABELS[tag];
  if (!label) {
    return null;
  }

  const tr = doc.createElement('tr');
  const th = doc.createElement('th');
  th.textContent = label;
  const td = doc.createElement('td');
  td.append(...rowEl.childNodes);
  tr.append(th, td);
  return tr;
}

function buildIdentityAside(doc, identityEl) {
  const aside = doc.createElement('aside');
  aside.setAttribute('aria-label', 'Identity');

  const table = doc.createElement('table');
  const tbody = doc.createElement('tbody');

  [...identityEl.children].forEach((child) => {
    const row = createTableRowFromElement(doc, child);
    if (row) {
      tbody.append(row);
    }
  });

  table.append(tbody);
  aside.append(table);
  return aside;
}

function upgradeProfileIdentityInDocument(doc) {
  doc.querySelectorAll('profile-identity').forEach((identity) => {
    if (identity.closest('aside[aria-label="Identity"]')) {
      return;
    }

    identity.replaceWith(buildIdentityAside(doc, identity));
  });
}

class ProfileTableRow extends HTMLElement {
  static get rowLabel() {
    return '';
  }

  createTableRow() {
    return createTableRowFromElement(this.ownerDocument, this);
  }
}

class TablePhoto extends HTMLElement {
  createTableRow() {
    return createTableRowFromElement(this.ownerDocument, this);
  }
}

class TableName extends ProfileTableRow {
  static get rowLabel() {
    return 'Name';
  }
}

class TableAka extends ProfileTableRow {
  static get rowLabel() {
    return 'Also known as';
  }
}

class TableGender extends ProfileTableRow {
  static get rowLabel() {
    return 'Gender';
  }
}

class TableOccupation extends ProfileTableRow {
  static get rowLabel() {
    return 'Occupation';
  }
}

class TableBirth extends ProfileTableRow {
  static get rowLabel() {
    return 'Birth';
  }
}

class TableBaptism extends ProfileTableRow {
  static get rowLabel() {
    return 'Baptism';
  }
}

class TableDeath extends ProfileTableRow {
  static get rowLabel() {
    return 'Death';
  }
}

class TableResidence extends ProfileTableRow {
  static get rowLabel() {
    return 'Last residence';
  }
}

class TablePlaceOfBurial extends ProfileTableRow {
  static get rowLabel() {
    return 'Place of burial';
  }
}

class TableImmediateFamily extends ProfileTableRow {
  static get rowLabel() {
    return 'Immediate family';
  }
}

class ProfileIdentity extends HTMLElement {
  #render() {
    if (!this.isConnected || this.dataset.rendered === 'true') {
      return;
    }

    [...this.querySelectorAll(':scope > *')].forEach((child) => {
      customElements.upgrade(child);
    });

    const aside = buildIdentityAside(this.ownerDocument, this);
    if (!aside.querySelector('tbody').children.length) {
      return;
    }

    this.dataset.rendered = 'true';
    this.replaceWith(aside);
  }

  connectedCallback() {
    queueMicrotask(() => this.#render());
  }
}

const PROFILE_TABLE_ELEMENTS = [
  ['profile-identity', ProfileIdentity],
  ['table-photo', TablePhoto],
  ['table-name', TableName],
  ['table-aka', TableAka],
  ['table-gender', TableGender],
  ['table-occupation', TableOccupation],
  ['table-birth', TableBirth],
  ['table-baptism', TableBaptism],
  ['table-death', TableDeath],
  ['table-residence', TableResidence],
  ['table-place-of-burial', TablePlaceOfBurial],
  ['table-immediate-family', TableImmediateFamily],
];

PROFILE_TABLE_ELEMENTS.forEach(([name, ctor]) => {
  if (!customElements.get(name)) {
    customElements.define(name, ctor);
  }
});

window.upgradeProfileIdentityInDocument = upgradeProfileIdentityInDocument;

/**
 * Hover/focus popovers for the identity box.
 *
 * Two kinds of triggers are enhanced:
 *   - `a.gp-person-link` (immediate-family links) -> a person preview card built
 *     lazily from PeopleDB.getPersonCardInfo (records are cached).
 *   - `.gp-location` (birth/death/residence/etc. places) -> a small map.
 *
 * Maps are PREFETCHED as soon as the identity box appears: every distinct place
 * is geocoded once (OpenStreetMap/Nominatim, throttled) and its map popover is
 * built and kept hidden, so the tiles are already loaded and hovering shows the
 * map instantly. The map's own attribution/controls bar is cropped out; a small
 * "© OpenStreetMap" credit is kept in the card footer for licence compliance.
 *
 * The popover stays open while the pointer is over the trigger or the popover —
 * including the transparent "bridge" over the gap between them.
 */
(function installIdentityPopovers() {
  if (typeof document === 'undefined' || window.__gpIdentityPopoversInstalled) {
    return;
  }
  window.__gpIdentityPopoversInstalled = true;

  const HIDE_DELAY = 320;
  const GAP = 8;
  const BRIDGE = 12;
  const PREFETCH_GAP = 1100; // ms between Nominatim requests (fair-use)

  const GENDER_ICON = {
    male: 'bi-gender-male',
    female: 'bi-gender-female',
    intersex: 'bi-gender-ambiguous',
    unknown: 'bi-question-circle',
  };
  const GENDER_LABEL = { male: 'Male', female: 'Female', intersex: 'Intersex', unknown: 'Unknown' };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
  const escapeAttr = (value) => encodeURIComponent(String(value ?? ''));

  function injectStyles() {
    if (document.getElementById('gp-identity-popover-styles')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'gp-identity-popover-styles';
    style.textContent = `
.gp-gender { display: inline-flex; align-items: center; gap: 0.4em; }
.gp-gender__icon { flex: 0 0 auto; opacity: 0.7; }
.gp-location { display: inline; cursor: help; }
.gp-location__text { text-decoration: underline dotted; text-underline-offset: 0.15em; text-decoration-thickness: 1px; }
.gp-location .gp-location__flag { display: inline-block; width: 1.45em; height: auto; margin-left: 0.35em; vertical-align: -0.12em; border-radius: 0.12em; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.16); }
.gp-pop {
  position: fixed;
  z-index: 2147483000;
  width: 300px;
  max-width: calc(100vw - 16px);
  border: 1px solid rgba(0, 0, 0, 0.16);
  border-radius: 0.5rem;
  background: #ffffff;
  color: #202122;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 0.82rem;
  line-height: 1.4;
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition: opacity 0.12s ease, transform 0.12s ease;
  pointer-events: none;
}
.gp-pop.is-visible { opacity: 1; visibility: visible; transform: translateY(0); pointer-events: auto; }
.gp-pop::before { content: ''; position: absolute; left: 0; right: 0; height: ${BRIDGE}px; }
.gp-pop--below::before { top: -${BRIDGE}px; }
.gp-pop--above::before { bottom: -${BRIDGE}px; }
.gp-pop a { color: inherit; text-decoration: none; }
.gp-pop__photo { display: block; width: 100%; height: 184px; background: #eaecf0; }
.gp-pop__photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
.gp-pop__photo--placeholder { display: flex; align-items: center; justify-content: center; color: #9aa0a6; font-size: 4rem; }
/* Map: the iframe extends BELOW its window (anchored at the top) so only the
   OpenStreetMap attribution/"Report a problem" bar at the bottom is clipped away.
   The top stays put, keeping the +/- zoom controls fully visible. */
.gp-pop__map-wrap { position: relative; width: 100%; height: 184px; overflow: hidden; background: #e8eef2; }
.gp-pop__map-wrap--loading { display: flex; align-items: center; justify-content: center; color: #9aa0a6; font-size: 2.4rem; }
.gp-pop__map { position: absolute; top: -1px; left: -1px; width: calc(100% + 2px); height: 232px; border: 0; pointer-events: auto; }
.gp-pop__body { padding: 0.65rem 0.75rem 0.75rem; }
.gp-pop__name { display: inline-block; font-weight: 700; font-size: 1rem; line-height: 1.25; }
.gp-pop__name:hover { text-decoration: underline; }
.gp-pop__gender { margin-left: 0.4em; opacity: 0.7; font-weight: 400; }
.gp-pop__life { margin-top: 0.1rem; color: #54595d; }
.gp-pop__title { font-weight: 600; font-size: 0.92rem; display: flex; align-items: baseline; gap: 0.35rem; }
.gp-pop__row { display: flex; align-items: flex-start; gap: 0.45rem; margin-top: 0.4rem; color: #404244; }
.gp-pop__row .bi { margin-top: 0.12rem; flex: 0 0 auto; color: #72777d; }
.gp-pop__row span { min-width: 0; }
.gp-pop__muted { margin-top: 0.25rem; color: #72777d; }
.gp-pop__location-link { display: flex; align-items: flex-start; gap: 0.35rem; font-weight: 700; line-height: 1.3; }
.gp-pop__location-link:hover span { text-decoration: underline; }
.gp-pop__location-link .bi { margin-top: 0.08rem; flex: 0 0 auto; color: #72777d; }
.gp-pop__cta { display: inline-flex; align-items: center; gap: 0.2rem; color: #3366cc; font-weight: 600; }
.gp-pop__cta:hover { text-decoration: underline; }
body.theme-dark .gp-pop {
  border-color: rgba(255, 255, 255, 0.16);
  background: #1f2329;
  color: #eaecf0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}
body.theme-dark .gp-pop__photo, body.theme-dark .gp-pop__map-wrap { background: #2a2f36; }
body.theme-dark .gp-pop__photo--placeholder, body.theme-dark .gp-pop__map-wrap--loading { color: #6b7178; }
body.theme-dark .gp-pop__life, body.theme-dark .gp-pop__muted { color: #9aa0a6; }
body.theme-dark .gp-pop__row { color: #d4d8dd; }
body.theme-dark .gp-pop__row .bi, body.theme-dark .gp-pop__location-link .bi { color: #9aa0a6; }
body.theme-dark .gp-pop__cta { color: #6b9eff; }
`;
    document.head.appendChild(style);
  }

  // ---- Shared positioning / show / hide ----------------------------------

  let activePop = null;
  let activeTrigger = null;
  let hideTimer = null;
  let renderSeq = 0;

  function positionPop(el, trigger) {
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const width = el.offsetWidth;
    const height = el.offsetHeight;

    let left = rect.left;
    if (left + width > window.innerWidth - margin) {
      left = window.innerWidth - margin - width;
    }
    left = Math.max(margin, left);

    let placement = 'below';
    let top = rect.bottom + GAP;
    if (top + height > window.innerHeight - margin) {
      const above = rect.top - GAP - height;
      if (above >= margin) {
        top = above;
        placement = 'above';
      } else {
        top = Math.max(margin, window.innerHeight - margin - height);
      }
    }

    el.classList.toggle('gp-pop--above', placement === 'above');
    el.classList.toggle('gp-pop--below', placement !== 'above');
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }

  function revealPop(el, trigger) {
    if (activePop && activePop !== el) {
      activePop.classList.remove('is-visible');
    }
    el.style.visibility = 'hidden';
    el.classList.add('is-visible');
    positionPop(el, trigger);
    el.style.visibility = '';
    activePop = el;
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (activePop) {
        activePop.classList.remove('is-visible');
      }
      activePop = null;
      activeTrigger = null;
    }, HIDE_DELAY);
  }

  function overPopover(node) {
    return Boolean(activePop && (node === activePop || activePop.contains(node)));
  }

  // ---- Person popover (single, shared, lazy) -----------------------------

  let personPop = null;
  const personValues = new Map();
  const personPromises = new Map();

  function ensurePersonPop() {
    if (!personPop) {
      personPop = document.createElement('div');
      personPop.className = 'gp-pop gp-pop--person';
      personPop.setAttribute('role', 'tooltip');
      document.body.appendChild(personPop);
    }
    return personPop;
  }

  function loadPersonInfo(id) {
    if (personPromises.has(id)) {
      return personPromises.get(id);
    }
    const api = window.PeopleDB;
    const source = api && typeof api.getPersonCardInfo === 'function'
      ? Promise.resolve().then(() => api.getPersonCardInfo(id))
      : Promise.resolve(null);
    const promise = source.catch(() => null).then((info) => {
      personValues.set(id, info);
      return info;
    });
    personPromises.set(id, promise);
    return promise;
  }

  function joinDatePlace(detail) {
    const parts = [];
    if (detail.date) parts.push(detail.date);
    if (detail.place) parts.push(detail.place);
    let text = parts.join(' · ');
    if (detail.cause) {
      text += text ? ` (${detail.cause})` : detail.cause;
    }
    return text;
  }

  function detailRow(icon, label, value) {
    const prefix = label ? `<strong>${label}</strong> ` : '';
    return `<div class="gp-pop__row"><i class="bi ${icon}"></i><span>${prefix}${escapeHtml(value)}</span></div>`;
  }

  function buildPersonLoading(trigger) {
    const name = (trigger.textContent || '').trim();
    return '<div class="gp-pop__photo gp-pop__photo--placeholder"><i class="bi bi-person-circle"></i></div>'
      + '<div class="gp-pop__body">'
      + `<span class="gp-pop__name">${escapeHtml(name)}</span>`
      + '<div class="gp-pop__muted">Loading…</div>'
      + '</div>';
  }

  function buildPersonCard(info, trigger) {
    const href = escapeHtml(trigger.getAttribute('href') || '#');
    if (!info) {
      const name = (trigger.textContent || '').trim();
      return '<div class="gp-pop__body">'
        + `<a class="gp-pop__name" href="${href}">${escapeHtml(name)}</a>`
        + `<a class="gp-pop__cta" href="${href}">View profile <i class="bi bi-arrow-right-short"></i></a>`
        + '</div>';
    }
    const photo = info.photo
      ? `<a class="gp-pop__photo" href="${href}"><img src="${escapeHtml(info.photo)}" alt="" loading="lazy"></a>`
      : '<div class="gp-pop__photo gp-pop__photo--placeholder"><i class="bi bi-person-circle"></i></div>';
    const genderIcon = info.gender && GENDER_ICON[info.gender]
      ? ` <i class="bi ${GENDER_ICON[info.gender]} gp-pop__gender" title="${escapeHtml(GENDER_LABEL[info.gender] || '')}" aria-hidden="true"></i>`
      : '';
    const rows = [];
    if (info.lifeSpan) {
      rows.push(`<div class="gp-pop__life">${escapeHtml(info.lifeSpan)}</div>`);
    }
    if (Array.isArray(info.alsoKnownAs) && info.alsoKnownAs.length) {
      rows.push(detailRow('bi-card-text', 'Also known as', info.alsoKnownAs.join(', ')));
    }
    if (info.born) {
      rows.push(detailRow('bi-calendar-event', 'Born', joinDatePlace(info.born)));
    }
    if (info.baptism) {
      rows.push(detailRow('bi-droplet', 'Baptised', joinDatePlace(info.baptism)));
    }
    if (info.died) {
      rows.push(detailRow('bi-calendar-x', 'Died', joinDatePlace(info.died)));
    }
    if (info.buried) {
      rows.push(detailRow('bi-flower2', 'Buried', joinDatePlace(info.buried)));
    }
    if (info.occupation) {
      rows.push(detailRow('bi-briefcase', '', info.occupation));
    }
    if (info.residence) {
      rows.push(detailRow('bi-house-door', 'Residence', info.residence));
    }
    const family = [];
    if (info.childrenCount) {
      family.push(`${info.childrenCount} ${info.childrenCount === 1 ? 'child' : 'children'}`);
    }
    if (info.spouseCount) {
      family.push(`${info.spouseCount} ${info.spouseCount === 1 ? 'partner' : 'partners'}`);
    }
    if (family.length) {
      rows.push(detailRow('bi-people', '', family.join(' · ')));
    }
    return `${photo}<div class="gp-pop__body">`
      + `<a class="gp-pop__name" href="${href}">${escapeHtml(info.name)}</a>${genderIcon}`
      + rows.join('')
      + `<a class="gp-pop__cta" href="${href}">View profile <i class="bi bi-arrow-right-short"></i></a>`
      + '</div>';
  }

  function showPerson(trigger) {
    const el = ensurePersonPop();
    if (activeTrigger !== trigger) {
      activeTrigger = trigger;
      const seq = ++renderSeq;
      const id = trigger.dataset.personId;
      if (id && personValues.has(id)) {
        el.innerHTML = buildPersonCard(personValues.get(id), trigger);
      } else {
        el.innerHTML = buildPersonLoading(trigger);
        if (id) {
          loadPersonInfo(id).then((info) => {
            if (seq !== renderSeq) return;
            el.innerHTML = buildPersonCard(info, trigger);
            revealPop(el, trigger);
          });
        }
      }
    }
    revealPop(el, trigger);
  }

  // ---- Location popovers (one per place, prefetched) ---------------------

  const geoValues = new Map();
  const geoPromises = new Map();
  const locationPops = new Map(); // place -> { el, filled, filling }

  function uniqueLocationQueries(values) {
    const seen = new Set();
    return values
      .map((value) => String(value || '').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim())
      .filter((value) => {
        if (!value) return false;
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function dehyphenateLocationText(value) {
    return String(value || '').replace(/([A-Za-zÀ-ž])[-‐‑‒–—]([A-Za-zÀ-ž])/g, '$1 $2');
  }

  function withoutDirectionalSuffix(value) {
    return String(value || '')
      .replace(/\s*[-‐‑‒–—]\s*(wes|west|oos|east|noord|north|suid|south)$/i, '')
      .trim();
  }

  function locationQueryCandidates(place) {
    const original = String(place || '').trim();
    const afterColon = original.includes(':') ? original.split(':').pop().trim() : '';
    const baseValues = uniqueLocationQueries([
      original,
      afterColon,
      dehyphenateLocationText(afterColon),
      dehyphenateLocationText(original),
    ]);
    const candidates = [...baseValues];

    for (const base of baseValues) {
      const parts = base.split(',').map((part) => part.trim()).filter(Boolean);
      const country = parts.length > 1 ? parts[parts.length - 1] : '';
      const first = parts[0] || '';
      const locality = parts.length > 1 ? parts[1] : '';

      if (country && locality) {
        candidates.push([locality, country].join(', '));
      }

      const shortenedFirst = withoutDirectionalSuffix(first);
      if (shortenedFirst && shortenedFirst !== first) {
        if (country && locality) {
          candidates.push([shortenedFirst, locality, country].join(', '));
        }
        candidates.push([shortenedFirst, ...parts.slice(1)].join(', '));
      }

      for (let index = 1; index < parts.length; index += 1) {
        candidates.push(parts.slice(index).join(', '));
      }
    }

    return uniqueLocationQueries(candidates).slice(0, 10);
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchGeocodeCandidate(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const r = data[0];
    const bb = Array.isArray(r.boundingbox) && r.boundingbox.length === 4 ? r.boundingbox : null;
    return {
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      // Nominatim: [south, north, west, east] -> OSM embed bbox: west,south,east,north
      bbox: bb ? [bb[2], bb[0], bb[3], bb[1]].map(Number) : null,
      query,
    };
  }

  async function geocode(place) {
    if (geoValues.has(place)) {
      return geoValues.get(place);
    }
    if (geoPromises.has(place)) {
      return geoPromises.get(place);
    }
    const promise = (async () => {
      try {
        const queries = locationQueryCandidates(place);
        for (const [index, query] of queries.entries()) {
          if (index > 0) {
            await wait(PREFETCH_GAP);
          }
          const geo = await fetchGeocodeCandidate(query);
          if (geo) return geo;
        }
        return null;
      } catch (e) {
        return null;
      }
    })().then((value) => {
      geoValues.set(place, value);
      return value;
    });
    geoPromises.set(place, promise);
    return promise;
  }

  function buildLocationLoading(place) {
    return '<div class="gp-pop__map-wrap gp-pop__map-wrap--loading"><i class="bi bi-map"></i></div>'
      + `<div class="gp-pop__body"><div class="gp-pop__title"><i class="bi bi-geo-alt"></i><span>${escapeHtml(place)}</span></div>`
      + '<div class="gp-pop__muted">Loading map…</div></div>';
  }

  function buildLocationCard(place, geo) {
    const title = `<div class="gp-pop__title"><i class="bi bi-geo-alt"></i><span>${escapeHtml(place)}</span></div>`;
    if (!geo || !isFinite(geo.lat) || !isFinite(geo.lon)) {
      const search = `https://www.openstreetmap.org/search?query=${escapeAttr(place)}`;
      return '<div class="gp-pop__body">'
        + title
        + '<div class="gp-pop__muted">No map location found.</div>'
        + `<a class="gp-pop__cta" href="${search}" target="_blank" rel="noopener">Search on OpenStreetMap <i class="bi bi-box-arrow-up-right"></i></a>`
        + '</div>';
    }
    const d = 0.05;
    const bbox = geo.bbox || [geo.lon - d, geo.lat - d, geo.lon + d, geo.lat + d];
    const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.join(',')}&layer=mapnik&marker=${geo.lat},${geo.lon}`;
    const large = `https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lon}#map=12/${geo.lat}/${geo.lon}`;
    return `<div class="gp-pop__map-wrap"><iframe class="gp-pop__map" src="${escapeHtml(embed)}" tabindex="-1" aria-hidden="true" title="Map of ${escapeHtml(place)}"></iframe></div>`
      + '<div class="gp-pop__body">'
      + `<a class="gp-pop__location-link" href="${escapeHtml(large)}" target="_blank" rel="noopener"><i class="bi bi-geo-alt"></i><span>${escapeHtml(place)}</span></a>`
      + '</div>';
  }

  function fillLocationPop(entry) {
    if (entry.filled || entry.filling) {
      return entry.promise || Promise.resolve();
    }
    entry.filling = true;
    entry.promise = geocode(entry.place).then((geo) => {
      entry.el.innerHTML = buildLocationCard(entry.place, geo);
      entry.filled = true;
      entry.filling = false;
      if (activePop === entry.el && activeTrigger) {
        positionPop(entry.el, activeTrigger);
      }
    });
    return entry.promise;
  }

  function ensureLocationPop(place) {
    let entry = locationPops.get(place);
    if (entry) {
      return entry;
    }
    const el = document.createElement('div');
    el.className = 'gp-pop gp-pop--location';
    el.setAttribute('role', 'tooltip');
    // Park off-screen until first shown; the iframe inside still loads its tiles.
    el.style.left = '-9999px';
    el.style.top = '0';
    el.innerHTML = buildLocationLoading(place);
    document.body.appendChild(el);
    entry = { el, place, filled: false, filling: false, promise: null };
    locationPops.set(place, entry);
    fillLocationPop(entry); // geocode + build the map (loads tiles now)
    return entry;
  }

  function showLocation(trigger) {
    const place = (trigger.dataset.place || trigger.textContent || '').trim();
    if (!place) return;
    const entry = ensureLocationPop(place);
    activeTrigger = trigger;
    revealPop(entry.el, trigger);
  }

  // ---- Prefetch: geocode + build every place's map up front --------------

  const prefetchQueued = new Set();
  const prefetchQueue = [];
  let prefetching = false;

  function enqueuePrefetch(place) {
    if (!place || prefetchQueued.has(place)) return;
    prefetchQueued.add(place);
    prefetchQueue.push(place);
    pumpPrefetch();
  }

  function pumpPrefetch() {
    if (prefetching || !prefetchQueue.length) return;
    prefetching = true;
    const place = prefetchQueue.shift();
    const entry = ensureLocationPop(place); // builds + starts geocode/tiles
    Promise.resolve(entry.promise).catch(() => {}).then(() => {
      setTimeout(() => {
        prefetching = false;
        pumpPrefetch();
      }, PREFETCH_GAP);
    });
  }

  let scanTimer = null;
  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanLocations, 300);
  }

  function scanLocations() {
    document.querySelectorAll('.gp-location').forEach((el) => {
      const place = (el.dataset.place || el.textContent || '').trim();
      if (place) enqueuePrefetch(place);
    });
  }

  // ---- Wiring ------------------------------------------------------------

  function triggerFrom(node) {
    if (!node || !node.closest) {
      return null;
    }
    const person = node.closest('a.gp-person-link');
    if (person) return { trigger: person, kind: 'person' };
    const location = node.closest('.gp-location');
    if (location) return { trigger: location, kind: 'location' };
    return null;
  }

  function show(trigger, kind) {
    clearTimeout(hideTimer);
    if (kind === 'person') showPerson(trigger);
    else showLocation(trigger);
  }

  document.addEventListener('mouseover', (event) => {
    const found = triggerFrom(event.target);
    if (found) {
      show(found.trigger, found.kind);
      return;
    }
    if (overPopover(event.target)) {
      clearTimeout(hideTimer);
      return;
    }
    if (activeTrigger) {
      scheduleHide();
    }
  });

  document.addEventListener('focusin', (event) => {
    const found = triggerFrom(event.target);
    if (found) {
      show(found.trigger, found.kind);
    }
  });

  document.addEventListener('focusout', (event) => {
    if (triggerFrom(event.target)) {
      scheduleHide();
    }
  });

  window.addEventListener('scroll', () => {
    if (activeTrigger) {
      scheduleHide();
    }
  }, true);

  function init() {
    injectStyles();
    scanLocations();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length) {
          scheduleScan();
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

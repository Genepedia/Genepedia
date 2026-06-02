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
  'table-gender': 'Gender',
  'table-birth': 'Birth',
  'table-death': 'Death',
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

class TableGender extends ProfileTableRow {
  static get rowLabel() {
    return 'Gender';
  }
}

class TableBirth extends ProfileTableRow {
  static get rowLabel() {
    return 'Birth';
  }
}

class TableDeath extends ProfileTableRow {
  static get rowLabel() {
    return 'Death';
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
  ['table-gender', TableGender],
  ['table-birth', TableBirth],
  ['table-death', TableDeath],
  ['table-place-of-burial', TablePlaceOfBurial],
  ['table-immediate-family', TableImmediateFamily],
];

PROFILE_TABLE_ELEMENTS.forEach(([name, ctor]) => {
  if (!customElements.get(name)) {
    customElements.define(name, ctor);
  }
});

window.upgradeProfileIdentityInDocument = upgradeProfileIdentityInDocument;

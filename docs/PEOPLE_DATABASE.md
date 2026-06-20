# People Database (file-based)

Genepedia stores family-tree data as plain files so it can scale to millions of
profiles on static hosting (GitHub Pages) with no server database. There are
three layers:

1. **Canonical JSON database** — structured, sharded, machine-readable.
2. **Per-person profile folders** — SEO-friendly pages served at `/pages/people/<id>/`.
3. **GEDCOM** — import/export interchange only (not the source of truth at runtime).

## Canonical database: `data/people/`

| Path | Purpose |
| --- | --- |
| `manifest.json` | Schema version, host, counts, shard strategy, reserved ids. |
| `persons/<bucket>/<id>.json` | Full person record (names, events, media, relationships, pets). |
| `unions/<bucket>/<id>.json` | Family/union record (`partners`, `children`, marriage/divorce). |
| `index/summary/<bucket>.json` | Lightweight summaries for listings/sitemaps. |
| `index/search/<key>.json` | Name-prefix search shards (2-char keys) for scalable static search. |
| `index/all-ids.json` | Ordered id list. |
| `sources/gedcom-id-map.json` | GEDCOM xref / Geni id → local id. |
| `export/full-tree.ged` | Regenerated normalized GEDCOM for the whole tree. |
| `reports/*.json` | Import, media, and privacy audit reports. |

**Bucketing:** `bucket = floor((id - 1) / 1000)` keeps ≤1000 files per directory,
so the layout scales without unbounded directory growth.

Shared helpers live in [scripts/lib/people-db-paths.mjs](../scripts/lib/people-db-paths.mjs).

## Per-person folders: `pages/people/<id>/`

The database is the single source of truth for **structured data**. Each person
folder is deliberately thin — only the SEO shell and the editable prose:

| File | Purpose |
| --- | --- |
| `index.html` | Static SEO shell (pre-rendered `<title>`, meta description, canonical link, Open Graph, JSON-LD `Person`, `<noscript>` facts) hosting `<people-page>`. |
| `data/profile.html` | Authored narrative prose (the editable biography). The first `<h1>` is the page title. |
| `data/images/` | Portraits referenced by the prose and the infobox (downloaded locally when media is fetched). |

Everything else is rendered at runtime by `<people-page>` reading the database:

- the **identity infobox** is built from `persons/<id>.json` (via `lib/people-db.js` + `lib/profile-infobox-render.js`),
- **immediate-family** links are resolved from `relationships` + summary shards,
- the **family tree** is generated on demand as GEDCOM from the JSON records (a `blob:` URL fed to `<family-tree>`),
- the **media gallery** comes from the record/`data/images`.

Ownership/claims live in the database at `data/people/ownership/<bucket>/<id>.json`
(not in the person folder). There is no per-person `profile.json`,
`profile-table.html`, `family-tree.ged`, `media.html`, or `tree.html` — those were
redundant with the database and have been removed.

Routes are clean directories (`/pages/people/<id>/` and `/pages/pets/<id>/`) because GitHub Pages has no URL
rewrites; every route maps to a real `index.html`.

## How editing and adding work (write path)

The frontend reads from the database; edits write canonical files back through the
PHP commit API (`API/github-submit-page-edit.php`), which commits directly for
managed profiles or opens a pull request otherwise.

- **Edit infobox** (`profile-infobox-editor.js`): loads `persons/<id>.json`, merges
  the edited identity fields back into the record (preserving relationships), and
  publishes `data/people/persons/<bucket>/<id>.json` + a regenerated
  `pages/people/<id>/index.html`.
- **Edit relationships / pets** (`profile-relationships-editor.js`): edits unions
  (parents/partners/children) and the owner's **pets**. Pets live in a **separate
  parallel database** at `data/Genepedia-Database/pets/` that mirrors the people
  layout (`persons/`, `unions/`, indexes) with **its own id sequence starting at
  1**, so animals can have full family trees of their own (pet unions, children)
  without people. Each pet record carries `kind: "pet"`, `species`, and an `owner`
  back-reference; the owning person links them via `pets: [petId,...]`. Pets are
  served at `pages/pets/<id>/` and registered in `pages/pets/pets.json`. Saving an
  "Add pet" card allocates the next pet id, publishes the pet record (in the pets
  DB), its SEO shell + prose, the pets registry, and the updated owner record.
  A person's tree attaches their pets via a synthetic `@PETF_<ownerId>@` family
  (xref space `@PET<id>@`, never colliding with people); a pet's own tree is built
  straight from the pets database (`buildPetNeighborhoodGedcom`). Pets are tagged
  `_PET <species>` so the `<family-tree>` viewer hides them by default behind a
  "Show pets" toggle, and they are excluded from site search unless the Settings
  page "Show pets in search results" toggle is enabled.
- **Edit prose** (`profile-page-editor.js`): publishes `pages/people/<id>/data/profile.html`.
- **Claim / ownership** (`profile-editor.js`): publishes
  `data/people/ownership/<bucket>/<id>.json`.
- **Add a person**: allocates the next id, then publishes `index.html`,
  `data/profile.html`, the person record, and the ownership record (plus a
  `people.json` registry entry).

The API path allowlist accepts `pages/people/<id>/index.html`, `people/<id>/data/*.html`,
`data/people/**.json`, `people/people.json`, and `sitemap.xml`.

Derived indexes (summary/search shards, `all-ids.json`, `people.json`, `sitemap.xml`,
manifest counts) are regenerated from the per-person records with:

```bash
node scripts/reindex.mjs            # rebuild every derived index from persons/*.json
```

Run reindex after a batch of edits/adds (locally or from CI) so search and listings
reflect the new data. Individual edits keep the page itself correct immediately
because `<people-page>` reads the record directly.

## Importing from GEDCOM

The importer turns `data/export-Forest.ged` into the database + profile folders.

```bash
# Validate counts only (writes nothing)
node scripts/import-gedcom.mjs --dry-run

# Full rebuild: remove old people/<n> (except reserved) then import
node scripts/import-gedcom.mjs --reset

# Also download portraits locally (best effort; needs network)
node scripts/import-gedcom.mjs --reset --media

# Limit individuals (testing)
node scripts/import-gedcom.mjs --limit 50
```

Key behaviours:

- **Local ids** are sequential from `1`, **skipping reserved id `15`** (Nelson
  Mandela, kept as a standalone hand-authored profile).
- **`{geni:about_me}` notes** become the starter HTML in `data/profile.html`,
  with Geni person links rewritten to local `/people/<id>/` routes.
- **Media** (`_PRIM Y` → primary portrait) is downloaded with `--media`;
  otherwise the remote URL is kept so portraits still display online and can be
  fetched later (the download step is idempotent and skips existing files).
- **Privacy:** people with no death and an unknown/recent birth are treated as
  living; their email addresses are dropped from records and never rendered.
- Nothing is committed — the importer only writes files.

Reserved (hand-authored) people are re-injected into the registry, search index,
summaries, and get a generated SEO `index.html`, while their authored `data/`
content is preserved untouched.

## Compatibility

`people/people.json` is still generated (`{ id, firstName, lastName, birthYear,
deathYear }`) so existing search/profile lookups keep working while the sharded
`index/search` shards provide the scalable path.

## Deployment note

The PHP API (`API/`) has been updated to the database model: `github-submit-page-edit.php`
accepts the new paths, and ownership reads/writes (`github-self-profile.php`,
`github-auth.php`, `github-maintainers.php`) use `data/people/ownership/...`.
Because the commit API needs GitHub OAuth, the end-to-end **write** path (edit, claim,
add-person) should be verified once against a deployed API; the **read** path runs
fully client-side from the static database and is verified locally.

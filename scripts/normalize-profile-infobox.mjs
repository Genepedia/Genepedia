#!/usr/bin/env node
/**
 * Normalise every profile to a single infobox storage model.
 *
 * The canonical model is: the identity table lives in
 * people/<id>/data/profile-table.html and profile.html references it with
 * <include src="profile-table.html"></include>. Some older profiles kept the
 * <profile-identity> block inline in profile.html instead. This script moves any
 * inline identity into profile-table.html and replaces it with the include, so
 * no profile is inline and none diverge from the rest.
 *
 * It is idempotent: profiles already using the include (or with no infobox) are
 * left untouched. Run from the repo root:  node scripts/normalize-profile-infobox.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PEOPLE_DIR = path.join(ROOT, "people");
const INCLUDE_TAG = '<include src="profile-table.html"></include>';
const IDENTITY_RE = /<profile-identity[\s\S]*?<\/profile-identity>/i;

let converted = 0;
let alreadyInclude = 0;
let noInfobox = 0;

for (const entry of fs.readdirSync(PEOPLE_DIR, { withFileTypes: true })) {
	if (!entry.isDirectory()) continue;
	const profilePath = path.join(PEOPLE_DIR, entry.name, "data", "profile.html");
	if (!fs.existsSync(profilePath)) continue;

	const html = fs.readFileSync(profilePath, "utf8");

	if (/<include\b/i.test(html)) {
		alreadyInclude += 1;
		continue;
	}

	const match = html.match(IDENTITY_RE);
	if (!match) {
		noInfobox += 1;
		continue;
	}

	const identityBlock = match[0].trim();
	const tablePath = path.join(PEOPLE_DIR, entry.name, "data", "profile-table.html");
	const fragment = `<!-- Profile identity table fragment -->\n${identityBlock}\n`;
	fs.writeFileSync(tablePath, fragment, "utf8");

	const updated = html.replace(IDENTITY_RE, INCLUDE_TAG);
	fs.writeFileSync(profilePath, updated, "utf8");

	converted += 1;
	console.log(`person ${entry.name}: inline → include (wrote data/profile-table.html)`);
}

console.log(
	`\nDone. Converted ${converted}, already include ${alreadyInclude}, no infobox ${noInfobox}.`,
);

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const packageJSON = require(path.join(projectRoot, "package.json"));
const manifest = JSON.parse(
	fs.readFileSync(
		path.join(projectRoot, "build/addon/manifest.json"),
		"utf8",
	),
);
const updateJSON = JSON.parse(
	fs.readFileSync(path.join(projectRoot, "build/update.json"), "utf8"),
);
const zoteroManifest = manifest.applications.zotero;
const updates = updateJSON.addons[packageJSON.config.addonID].updates;

assert.equal(zoteroManifest.id, packageJSON.config.addonID);
assert.equal(zoteroManifest.strict_max_version, "10.0.*");
assert.equal(zoteroManifest.update_url, packageJSON.config.updateJSON);
assert.doesNotMatch(zoteroManifest.update_url, /Dominic-DallOsto/i);
assert.equal(updates[0].version, packageJSON.version);
assert.equal(updates[0].applications.zotero.strict_max_version, "10.0.*");
assert.match(updates[0].update_link, /pascalleuthner/);

console.log("Verified Zotero 10 manifest and fork-owned update feed.");

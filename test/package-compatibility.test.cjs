const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

test("packages the fork for Zotero 10 without the upstream update identity", () => {
	const packageJSON = require(path.join(projectRoot, "package.json"));
	const manifest = JSON.parse(
		fs.readFileSync(path.join(projectRoot, "addon/manifest.json"), "utf8"),
	);

	assert.equal(manifest.applications.zotero.strict_max_version, "10.0.*");
	assert.equal(
		packageJSON.config.addonID,
		"zotero-reading-list@pascalleuthner.github.io",
	);
	assert.equal(packageJSON.config.addonRef, "zotero-reading-list-plus");
	assert.equal(packageJSON.config.addonInstance, "ZoteroReadingListPlus");
	assert.equal(
		packageJSON.config.prefsPrefix,
		"extensions.zotero.zotero-reading-list-plus",
	);
	assert.match(packageJSON.config.updateJSON, /pascalleuthner/);
	assert.doesNotMatch(packageJSON.config.updateJSON, /Dominic-DallOsto/i);
	assert.match(packageJSON.repository.url, /pascalleuthner/);
});

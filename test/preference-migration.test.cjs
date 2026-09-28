const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath) {
	const filename = path.resolve(__dirname, "..", relativePath);
	const source = fs.readFileSync(filename, "utf8");
	const output = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
		},
		fileName: filename,
	}).outputText;
	const loadedModule = { exports: {} };
	const execute = new Function(
		"exports",
		"module",
		"require",
		"__filename",
		"__dirname",
		output,
	);
	execute(
		loadedModule.exports,
		loadedModule,
		require,
		filename,
		path.dirname(filename),
	);
	return loadedModule.exports;
}

test("copies legacy preferences without overwriting values in the new namespace", () => {
	const { migratePreferenceValues } = loadTypeScriptModule(
		"src/utils/preferenceMigration.ts",
	);
	const values = new Map([
		["old.statuses", "New;Reading|star;book"],
		["old.shortcuts", false],
		["old.board", "New;Reading"],
		["new.board", "Reading"],
	]);

	migratePreferenceValues(
		["statuses", "shortcuts", "board", "missing"],
		"old",
		"new",
		(key) => values.get(key),
		(key, value) => values.set(key, value),
	);

	assert.equal(values.get("new.statuses"), "New;Reading|star;book");
	assert.equal(values.get("new.shortcuts"), false);
	assert.equal(values.get("new.board"), "Reading");
	assert.equal(values.has("new.missing"), false);
});

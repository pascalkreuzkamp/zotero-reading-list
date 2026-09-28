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

test("returns Zotero 10 item-view results without using a singular collection getter", () => {
	const { getCurrentViewItems } = loadTypeScriptModule(
		"src/utils/currentViewItems.ts",
	);
	const visibleItem = { isRegularItem: () => true };
	const pane = {
		itemsView: {
			getSortedItems: () => [visibleItem],
		},
		getSelectedCollection: () => {
			throw new Error("removed in Zotero 10");
		},
	};

	const items = getCurrentViewItems(pane, () => [], []);

	assert.deepEqual(items, [visibleItem]);
});

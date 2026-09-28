import { config } from "../../package.json";
import { migratePreferenceValues } from "./preferenceMigration";

const LEGACY_PREFS_PREFIX = "extensions.zotero.zotero-reading-list";
const MIGRATED_PREF_KEYS = [
	"show-icons",
	"read-status-format",
	"readstatuscolumn-format-header-showicon",
	"label-new-items",
	"label-items-when-opening-file",
	"enable-keyboard-shortcuts",
	"statuses-and-icons-list",
	"status-change-on-open-item-list",
	"reading-board-status-list",
];

export function migrateLegacyPreferences() {
	migratePreferenceValues(
		MIGRATED_PREF_KEYS,
		LEGACY_PREFS_PREFIX,
		config.prefsPrefix,
		(key): unknown => Zotero.Prefs.get(key, true) as unknown,
		(key, value) => {
			Zotero.Prefs.set(key, value, true);
		},
	);
}

/**
 * Get preference value.
 * Wrapper of `Zotero.Prefs.get`.
 * @param key
 */
export function getPref(key: string) {
	return Zotero.Prefs.get(`${config.prefsPrefix}.${key}`, true);
}

/**
 * Get global name of preference.
 * @param key
 */
export function getPrefGlobalName(key: string) {
	return `${config.prefsPrefix}.${key}`;
}

/**
 * Set preference value.
 * Wrapper of `Zotero.Prefs.set`.
 * @param key
 * @param value
 */
export function setPref(key: string, value: string | number | boolean) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return Zotero.Prefs.set(`${config.prefsPrefix}.${key}`, value, true);
}

/**
 * Set preference to a default value if it isn't already set.
 * @param key
 * @param defaultValue
 */
export function initialiseDefaultPref(
	key: string,
	defaultValue: string | number | boolean,
) {
	if (getPref(key) === undefined) {
		setPref(key, defaultValue);
	}
}

/**
 * Clear preference value.
 * Wrapper of `Zotero.Prefs.clear`.
 * @param key
 */
export function clearPref(key: string) {
	return Zotero.Prefs.clear(`${config.prefsPrefix}.${key}`, true);
}

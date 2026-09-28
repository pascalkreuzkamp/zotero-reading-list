export type PreferenceValue = string | number | boolean;

export function migratePreferenceValues(
	keys: string[],
	legacyPrefix: string,
	currentPrefix: string,
	getValue: (key: string) => unknown,
	setValue: (key: string, value: PreferenceValue) => void,
) {
	for (const key of keys) {
		const currentKey = `${currentPrefix}.${key}`;
		if (getValue(currentKey) !== undefined) {
			continue;
		}
		const legacyValue = getValue(`${legacyPrefix}.${key}`);
		if (
			typeof legacyValue == "string" ||
			typeof legacyValue == "number" ||
			typeof legacyValue == "boolean"
		) {
			setValue(currentKey, legacyValue);
		}
	}
}

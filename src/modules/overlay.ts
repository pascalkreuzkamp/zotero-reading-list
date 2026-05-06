import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { patch as $patch$, unpatch as $unpatch$ } from "../utils/patcher";
import {
	getPref,
	setPref,
	clearPref,
	initialiseDefaultPref,
	getPrefGlobalName,
} from "../utils/prefs";
import {
	getItemExtraProperty,
	setItemExtraProperty,
	clearItemExtraProperty,
	removeFieldValueFromExtraData,
} from "../utils/extraField";
const READ_STATUS_COLUMN_ID = "readstatus";
const READ_PRIORITY_COLUMN_ID = "readpriority";
const READING_BOARD_BUTTON_ID = "zotero-reading-list-board-button";
const READING_BOARD_MENU_ID = "zotero-reading-list-board-menu";
const READ_STATUS_EXTRA_FIELD = "Read_Status";
const READ_DATE_EXTRA_FIELD = "Read_Status_Date";
const READ_PRIORITY_EXTRA_FIELD = "Read_Priority";
const NO_STATUS = "";
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const PRIORITIES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

const OLD_DEFAULT_STATUS_NAMES = [
	"New",
	"To Read",
	"In Progress",
	"Read",
	"Not Reading",
];
const OLD_DEFAULT_STATUS_ICONS = ["⭐", "📙", "📖", "📗", "📕"];

export const DEFAULT_STATUS_NAMES = [
	"New",
	"To Read",
	"Queued",
	"Skimmed",
	"To Summarize",
	"Reading",
	"Read",
];
export const DEFAULT_STATUS_ICONS = ["⭐", "📙", "🧾", "👀", "📝", "📖", "📗"];

export const DEFAULT_STATUS_CHANGE_FROM = ["New", "To Read"];
export const DEFAULT_STATUS_CHANGE_TO = ["Reading", "Reading"];

export const SHOW_ICONS_PREF = "show-icons"; // deprecated
export const READ_STATUS_FORMAT_PREF = "read-status-format";
export const READ_STATUS_FORMAT_HEADER_SHOW_ICON =
	"readstatuscolumn-format-header-showicon";
export const LABEL_NEW_ITEMS_PREF = "label-new-items";
export const LABEL_NEW_ITEMS_PREF_DISABLED = "|none|";
export const LABEL_ITEMS_WHEN_OPENING_FILE_PREF =
	"label-items-when-opening-file";
export const ENABLE_KEYBOARD_SHORTCUTS_PREF = "enable-keyboard-shortcuts";
export const STATUS_NAME_AND_ICON_LIST_PREF = "statuses-and-icons-list";
export const STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF =
	"status-change-on-open-item-list";

enum ReadStatusFormat {
	ShowBoth = 0,
	ShowText = 1,
	ShowIcon = 2,
}

function getItemReadStatus(item: Zotero.Item) {
	const statusField = getItemExtraProperty(item, READ_STATUS_EXTRA_FIELD);
	return statusField.length == 1 ? statusField[0] : "";
}

function getItemReadPriority(item: Zotero.Item) {
	const priorityField = getItemExtraProperty(item, READ_PRIORITY_EXTRA_FIELD);
	return priorityField.length == 1 && PRIORITIES.includes(priorityField[0])
		? priorityField[0]
		: "";
}

function setItemReadStatus(item: Zotero.Item, statusName: string) {
	setItemExtraProperty(item, READ_STATUS_EXTRA_FIELD, statusName);
	setItemExtraProperty(
		item,
		READ_DATE_EXTRA_FIELD,
		new Date(Date.now()).toISOString(),
	);
	void item.saveTx();
}

function clearItemReadStatus(item: Zotero.Item) {
	clearItemExtraProperty(item, READ_STATUS_EXTRA_FIELD);
	clearItemExtraProperty(item, READ_DATE_EXTRA_FIELD);
	void item.saveTx();
}

function setItemsReadStatus(items: Zotero.Item[], statusName: string) {
	for (const item of items) {
		setItemReadStatus(item, statusName);
	}
}

function setItemReadPriority(item: Zotero.Item, priority: string) {
	if (PRIORITIES.includes(priority)) {
		setItemExtraProperty(item, READ_PRIORITY_EXTRA_FIELD, priority);
	} else {
		clearItemExtraProperty(item, READ_PRIORITY_EXTRA_FIELD);
	}
	void item.saveTx();
}

function setItemsReadPriority(items: Zotero.Item[], priority: string) {
	for (const item of items) {
		setItemReadPriority(item, priority);
	}
}

function setSelectedItemsReadStatus(statusName: string) {
	setItemsReadStatus(getSelectedItems(), statusName);
}

function setSelectedItemsReadPriority(priority: string) {
	setItemsReadPriority(getSelectedItems(), priority);
}

function clearSelectedItemsReadStatus() {
	const items = getSelectedItems();
	for (const item of items) {
		clearItemReadStatus(item);
	}
}

/**
 * Return selected regular items
 */
function getSelectedItems() {
	return ZoteroPane.getSelectedItems().filter((item) => item.isRegularItem());
}

export const FORBIDDEN_PREF_STRING_CHARACTERS = new Set(":;|");

export function prefStringToList(prefString: string) {
	const [statusString, iconString] = prefString.split("|");
	return [statusString.split(";"), iconString.split(";")];
}

export function listToPrefString(stringList: string[], iconList: string[]) {
	return stringList.join(";") + "|" + iconList.join(";");
}

function isOldDefaultStatusList(prefString: string) {
	return (
		prefString ==
		listToPrefString(OLD_DEFAULT_STATUS_NAMES, OLD_DEFAULT_STATUS_ICONS)
	);
}

function priorityForColumn(item: Zotero.Item) {
	const priority = getItemReadPriority(item);
	return priority ? priority.padStart(2, "0") : "";
}

function priorityForSort(item: Zotero.Item) {
	const priority = getItemReadPriority(item);
	return priority ? Number(priority) : -1;
}

function getActiveZoteroPane() {
	const zotero = Zotero as typeof Zotero & {
		getActiveZoteroPane?: () => _ZoteroTypes.ZoteroPane;
	};
	return zotero.getActiveZoteroPane?.() ?? ZoteroPane;
}

function getRegularItems(items: Zotero.Item[]) {
	return items.filter((item) => item?.isRegularItem());
}

function normalizeItems(itemsOrIDs: Zotero.Item[] | number[]): Zotero.Item[] {
	if (!itemsOrIDs.length) {
		return [];
	}
	if (typeof itemsOrIDs[0] == "number") {
		const itemIDs: number[] = [];
		for (const itemID of itemsOrIDs) {
			if (typeof itemID == "number") {
				itemIDs.push(itemID);
			}
		}
		return Zotero.Items.get(itemIDs);
	}
	const items: Zotero.Item[] = [];
	for (const item of itemsOrIDs) {
		if (typeof item != "number") {
			items.push(item);
		}
	}
	return items;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value == "object" && value != null;
}

function hasRegularItemMethod(
	value: unknown,
): value is Zotero.Item & { isRegularItem: () => boolean } {
	return isObject(value) && typeof value.isRegularItem == "function";
}

function isRegularZoteroItem(value: unknown): value is Zotero.Item {
	return hasRegularItemMethod(value) && value.isRegularItem();
}

function getItemFromID(id: number): Zotero.Item {
	return Zotero.Items.get(id);
}

function getItemFromViewRow(row: unknown) {
	if (!row) {
		return undefined;
	}
	if (isRegularZoteroItem(row)) {
		return row;
	}
	if (!isObject(row)) {
		return undefined;
	}
	if (isRegularZoteroItem(row.ref)) {
		return row.ref;
	}
	if (typeof row.id == "number") {
		return getItemFromID(row.id);
	}
	if (typeof row.itemID == "number") {
		return getItemFromID(row.itemID);
	}
	return undefined;
}

function getCurrentViewItems() {
	const pane = getActiveZoteroPane() as _ZoteroTypes.ZoteroPane & {
		getSortedItems?: () => Zotero.Item[] | number[];
		itemsView?: {
			rowCount?: number;
			_rowCount?: number;
			getRow?: (rowIndex: number) => unknown;
			getRowData?: (rowIndex: number) => unknown;
			getItemAtRow?: (rowIndex: number) => unknown;
			getItemID?: (rowIndex: number) => number;
		};
		getSelectedCollection?: () => { getChildItems: () => Zotero.Item[] };
	};
	const sortedItems = pane.getSortedItems?.();
	if (sortedItems?.length) {
		return getRegularItems(normalizeItems(sortedItems));
	}

	const itemsView = pane.itemsView;
	const rowCount = itemsView?.rowCount ?? itemsView?._rowCount;
	if (typeof rowCount == "number" && rowCount > 0) {
		const items: Zotero.Item[] = [];
		for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
			const row =
				itemsView.getRow?.(rowIndex) ??
				itemsView.getRowData?.(rowIndex) ??
				itemsView.getItemAtRow?.(rowIndex);
			const item =
				getItemFromViewRow(row) ??
				(typeof itemsView.getItemID == "function"
					? getItemFromID(itemsView.getItemID(rowIndex))
					: undefined);
			if (item?.isRegularItem()) {
				items.push(item);
			}
		}
		if (items.length) {
			return items;
		}
	}

	const selectedCollection = pane.getSelectedCollection?.();
	if (selectedCollection) {
		return getRegularItems(selectedCollection.getChildItems());
	}

	return getSelectedItems();
}

function getItemTitle(item: Zotero.Item) {
	return item.getField("title") || getString("board-untitled");
}

function getItemAuthors(item: Zotero.Item) {
	const creators = (
		item as Zotero.Item & { getCreators?: () => any[] }
	).getCreators?.();
	if (!creators?.length) {
		return "";
	}
	const names = creators.slice(0, 3).map((creator) => {
		const creatorData = creator as typeof creator & { name?: string };
		return (
			creator.lastName ??
			creatorData.name ??
			[creator.firstName, creator.lastName].filter(Boolean).join(" ")
		);
	});
	return creators.length > 3
		? `${names.filter(Boolean).join(", ")} et al.`
		: names.filter(Boolean).join(", ");
}

function getItemYear(item: Zotero.Item) {
	const date = item.getField("date");
	const match = String(date).match(/\d{4}/);
	return match ? match[0] : "";
}

function sortBoardItems(items: Zotero.Item[]) {
	return items.sort((a, b) => {
		const priorityDifference = priorityForSort(b) - priorityForSort(a);
		if (priorityDifference != 0) {
			return priorityDifference;
		}
		return getItemTitle(a).localeCompare(getItemTitle(b));
	});
}

function getDirectChild(parent: Element, child: Element) {
	let current: Element | null = child;
	while (current && current.parentNode != parent) {
		current = current.parentElement;
	}
	return current;
}

export default class ZoteroReadingList {
	itemAddedListenerID?: string;
	fileOpenedListenerID?: string;
	itemTreeReadStatusColumnId?: string | false;
	itemTreeReadPriorityColumnId?: string | false;
	readingBoardButton?: Element;
	readingBoardPanel?: HTMLElement;
	readingBoardButtonRetryIDs: number[] = [];
	preferenceUpdateObservers?: symbol[];
	statusNames: string[];
	statusIcons: string[];

	constructor() {
		this.initialiseDefaultPreferences();
		[this.statusNames, this.statusIcons] = prefStringToList(
			getPref(STATUS_NAME_AND_ICON_LIST_PREF)! as string,
		);

		this.addReadStatusColumn();
		this.addReadPriorityColumn();
		this.addPreferencesMenu();
		this.addRightClickMenuPopup();
		this.addReadingBoardMenu();
		this.addReadingBoardButton();

		if (getPref(ENABLE_KEYBOARD_SHORTCUTS_PREF)) {
			this.addKeyboardShortcutListener();
		}
		if (getPref(LABEL_NEW_ITEMS_PREF) != LABEL_NEW_ITEMS_PREF_DISABLED) {
			this.addNewItemLabeller();
		}
		if (getPref(LABEL_ITEMS_WHEN_OPENING_FILE_PREF)) {
			this.addFileOpenedListener();
		}

		this.addPreferenceUpdateObservers();
		this.removeReadStatusFromExports();
	}

	public unload() {
		this.removeReadStatusColumn();
		this.removeReadPriorityColumn();
		this.removePreferenceMenu();
		this.removeRightClickMenu();
		this.removeReadingBoardMenu();
		this.removeReadingBoardButton();
		this.closeReadingBoard();
		this.removeKeyboardShortcutListener();
		this.removeNewItemLabeller();
		this.removeFileOpenedListener();
		this.removePreferenceUpdateObservers();
		this.unpatchExportFunction();
	}

	initialiseDefaultPreferences() {
		// for migrating from old format pref (show icon or not) to new format pref (show both, text, or icon)
		// show icon -> show both
		// don't show icon -> show text
		// otherwise, default is show both
		const oldReadStatusColumnFormatPref_showIcons =
			getPref(SHOW_ICONS_PREF);
		if (
			typeof oldReadStatusColumnFormatPref_showIcons == "boolean" &&
			!oldReadStatusColumnFormatPref_showIcons
		) {
			initialiseDefaultPref(
				READ_STATUS_FORMAT_PREF,
				ReadStatusFormat.ShowText,
			);
		} else {
			initialiseDefaultPref(
				READ_STATUS_FORMAT_PREF,
				ReadStatusFormat.ShowBoth,
			);
		}
		initialiseDefaultPref(READ_STATUS_FORMAT_HEADER_SHOW_ICON, false);
		initialiseDefaultPref(ENABLE_KEYBOARD_SHORTCUTS_PREF, true);
		initialiseDefaultPref(LABEL_ITEMS_WHEN_OPENING_FILE_PREF, false);
		const defaultStatusPref = listToPrefString(
			DEFAULT_STATUS_NAMES,
			DEFAULT_STATUS_ICONS,
		);
		const currentStatusPref = getPref(STATUS_NAME_AND_ICON_LIST_PREF);
		if (typeof currentStatusPref == "string") {
			if (isOldDefaultStatusList(currentStatusPref)) {
				setPref(STATUS_NAME_AND_ICON_LIST_PREF, defaultStatusPref);
			}
		} else {
			initialiseDefaultPref(
				STATUS_NAME_AND_ICON_LIST_PREF,
				defaultStatusPref,
			);
		}
		initialiseDefaultPref(
			STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF,
			listToPrefString(
				DEFAULT_STATUS_CHANGE_FROM,
				DEFAULT_STATUS_CHANGE_TO,
			),
		);
		// for migrating from old label new items pref (true or false) to new format pref (disabled or choose read status to use)
		// true -> automatically label as first read status
		// false -> disabled
		const oldLabelNewItemsPref = getPref(LABEL_NEW_ITEMS_PREF);
		if (typeof oldLabelNewItemsPref == "boolean") {
			// need to clear then set Pref when changing type from bool to string
			clearPref(LABEL_NEW_ITEMS_PREF);
			if (oldLabelNewItemsPref) {
				setPref(
					LABEL_NEW_ITEMS_PREF,
					prefStringToList(
						getPref(STATUS_NAME_AND_ICON_LIST_PREF)! as string,
					)[0][0],
				);
			} else {
				setPref(LABEL_NEW_ITEMS_PREF, LABEL_NEW_ITEMS_PREF_DISABLED);
			}
		} else {
			initialiseDefaultPref(
				LABEL_NEW_ITEMS_PREF,
				LABEL_NEW_ITEMS_PREF_DISABLED,
			);
		}
	}

	addPreferenceUpdateObservers() {
		this.preferenceUpdateObservers = [
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(ENABLE_KEYBOARD_SHORTCUTS_PREF),
				(value: boolean) => {
					if (value) {
						this.addKeyboardShortcutListener();
					} else {
						this.removeKeyboardShortcutListener();
					}
				},
				true,
			),
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(LABEL_NEW_ITEMS_PREF),
				(value: string) => {
					if (value == LABEL_NEW_ITEMS_PREF_DISABLED) {
						this.removeNewItemLabeller();
					} else if (typeof this.itemAddedListenerID == "undefined") {
						this.addNewItemLabeller();
					}
				},
				true,
			),
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(LABEL_ITEMS_WHEN_OPENING_FILE_PREF),
				(value: boolean) => {
					if (value) {
						this.addFileOpenedListener();
					} else {
						this.removeFileOpenedListener();
					}
				},
				true,
			),
			// refresh read status column on format change
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(READ_STATUS_FORMAT_PREF),
				(value: boolean) => {
					this.removeReadStatusColumn();
					this.removeRightClickMenu();
					this.addReadStatusColumn();
					this.addRightClickMenuPopup();
				},
				true,
			),
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(READ_STATUS_FORMAT_HEADER_SHOW_ICON),
				(value: boolean) => {
					this.removeReadStatusColumn();
					this.addReadStatusColumn();
				},
				true,
			),
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(STATUS_NAME_AND_ICON_LIST_PREF),
				(value: string) => {
					[this.statusNames, this.statusIcons] =
						prefStringToList(value);
					this.removeRightClickMenu();
					this.addRightClickMenuPopup();
					this.removeKeyboardShortcutListener();
					this.addKeyboardShortcutListener();
					this.removeReadStatusColumn();
					this.addReadStatusColumn();
					this.renderReadingBoard();
				},
				true,
			),
		];
	}

	removePreferenceUpdateObservers() {
		if (this.preferenceUpdateObservers) {
			for (const preferenceUpdateObserverSymbol of this
				.preferenceUpdateObservers) {
				Zotero.Prefs.unregisterObserver(preferenceUpdateObserverSymbol);
			}
			this.preferenceUpdateObservers = undefined;
		}
	}

	addReadStatusColumn() {
		const formatStatusName = (statusName: string) =>
			this.formatStatusName(statusName);
		this.itemTreeReadStatusColumnId = Zotero.ItemTreeManager.registerColumn(
			{
				dataKey: `${config.addonID.replaceAll("-", "_").replaceAll("@", "_at_").replaceAll(".", "_")}_${READ_STATUS_COLUMN_ID}`,
				label: getString("read-status"),
				// If we just want to show the icon, overwrite the label with htmlLabel (#40)
				htmlLabel: getPref(READ_STATUS_FORMAT_HEADER_SHOW_ICON)
					? `<span class="icon icon-css icon-16" style="background: url(chrome://${config.addonRef}/content/icons/favicon.png) content-box no-repeat center/contain;" />`
					: undefined,
				pluginID: "", //config.addonID,
				dataProvider: (item: Zotero.Item, dataKey: string) => {
					return item.isRegularItem() ? getItemReadStatus(item) : "";
				},
				// if we put the icon in the dataprovider, it only gets updated when the read status changes
				// putting the icon in the render function updates when the row is clicked or column is sorted
				renderCell: function (
					index: number,
					data: string,
					column: { className: string },
				) {
					const text = document.createElementNS(
						"http://www.w3.org/1999/xhtml",
						"span",
					);
					text.className = "cell-text";
					text.innerText = formatStatusName(data);

					const cell = document.createElementNS(
						"http://www.w3.org/1999/xhtml",
						"span",
					);
					cell.className = `cell ${column.className}`;
					cell.append(text);

					return cell;
				},
				zoteroPersist: ["width", "hidden", "sortDirection"],
			},
		);
	}

	/**
	 * Format name of status to localise text and include icon if enabled.
	 * @param {string} statusName - The name of the status.
	 * @returns {String} values - Name of the status, possibly prefixed with the corresponding icon.
	 */
	formatStatusName(statusName: string): string {
		switch (getPref(READ_STATUS_FORMAT_PREF) as ReadStatusFormat) {
			case ReadStatusFormat.ShowBoth: {
				const statusIndex = this.statusNames.indexOf(statusName);
				return statusIndex > -1
					? `${this.statusIcons[statusIndex]} ${statusName}`
					: statusName;
			}
			case ReadStatusFormat.ShowText: {
				return statusName;
			}
			case ReadStatusFormat.ShowIcon: {
				const statusIndex = this.statusNames.indexOf(statusName);
				return statusIndex > -1
					? `${this.statusIcons[statusIndex]}`
					: statusName;
			}
		}
	}

	removeReadStatusColumn() {
		if (this.itemTreeReadStatusColumnId) {
			Zotero.ItemTreeManager.unregisterColumn(
				this.itemTreeReadStatusColumnId,
			);
			this.itemTreeReadStatusColumnId = undefined;
		}
	}

	addReadPriorityColumn() {
		this.itemTreeReadPriorityColumnId =
			Zotero.ItemTreeManager.registerColumn({
				dataKey: `${config.addonID.replaceAll("-", "_").replaceAll("@", "_at_").replaceAll(".", "_")}_${READ_PRIORITY_COLUMN_ID}`,
				label: getString("priority"),
				pluginID: "",
				dataProvider: (item: Zotero.Item, dataKey: string) => {
					return item.isRegularItem() ? priorityForColumn(item) : "";
				},
				renderCell: function (
					index: number,
					data: string,
					column: { className: string },
				) {
					const text = document.createElementNS(
						"http://www.w3.org/1999/xhtml",
						"span",
					);
					text.className = "cell-text";
					text.innerText = data ? String(Number(data)) : "";

					const cell = document.createElementNS(
						"http://www.w3.org/1999/xhtml",
						"span",
					);
					cell.className = `cell ${column.className}`;
					cell.append(text);

					return cell;
				},
				zoteroPersist: ["width", "hidden", "sortDirection"],
			});
	}

	removeReadPriorityColumn() {
		if (this.itemTreeReadPriorityColumnId) {
			Zotero.ItemTreeManager.unregisterColumn(
				this.itemTreeReadPriorityColumnId,
			);
			this.itemTreeReadPriorityColumnId = undefined;
		}
	}

	addPreferencesMenu() {
		const prefOptions = {
			pluginID: config.addonID,
			src: rootURI + "chrome/content/preferences.xhtml",
			label: getString("prefs-title"),
			image: `chrome://${config.addonRef}/content/icons/favicon.png`,
			defaultXUL: true,
		};
		void Zotero.PreferencePanes.register(prefOptions);
	}

	removePreferenceMenu() {
		Zotero.PreferencePanes.unregister(config.addonID);
	}

	addRightClickMenuPopup() {
		ztoolkit.Menu.register("item", {
			id: "zotero-reading-list-right-click-item-menu",
			tag: "menu",
			label: getString("menupopup-label"),
			children: [
				{
					tag: "menuitem",
					label: getString("status-none"),
					commandListener: (event) =>
						void clearSelectedItemsReadStatus(),
				} as MenuitemOptions,
			].concat(
				this.statusNames.map((status_name: string) => {
					return {
						tag: "menuitem",
						label: this.formatStatusName(status_name),
						commandListener: (event) =>
							setSelectedItemsReadStatus(status_name),
					};
				}),
			),
			getVisibility: (element, event) => {
				return getSelectedItems().length > 0;
			},
		});
		ztoolkit.Menu.register("item", {
			id: "zotero-reading-list-right-click-priority-menu",
			tag: "menu",
			label: getString("priority"),
			children: [
				{
					tag: "menuitem",
					label: getString("priority-none"),
					commandListener: (event) =>
						void setSelectedItemsReadPriority(""),
				} as MenuitemOptions,
			].concat(
				PRIORITIES.map((priority) => {
					return {
						tag: "menuitem",
						label: priority,
						commandListener: (event) =>
							setSelectedItemsReadPriority(priority),
					};
				}),
			),
			getVisibility: (element, event) => {
				return getSelectedItems().length > 0;
			},
		});
	}

	removeRightClickMenu() {
		ztoolkit.Menu.unregister("zotero-reading-list-right-click-item-menu");
		ztoolkit.Menu.unregister(
			"zotero-reading-list-right-click-priority-menu",
		);
	}

	addReadingBoardMenu() {
		ztoolkit.Menu.register("menuTools", {
			id: READING_BOARD_MENU_ID,
			tag: "menuitem",
			label: getString("reading-board-button"),
			commandListener: (event) => this.openReadingBoard(),
		});
	}

	removeReadingBoardMenu() {
		ztoolkit.Menu.unregister(READING_BOARD_MENU_ID);
	}

	addReadingBoardButton() {
		if (document.getElementById(READING_BOARD_BUTTON_ID)) {
			return;
		}

		const searchElement =
			document.getElementById("zotero-tb-search") ??
			document.getElementById("zotero-search-box") ??
			document.querySelector(
				"search-textbox, textbox[type='search'], input[type='search']",
			);
		const toolbar =
			searchElement?.closest("toolbar") ??
			document.getElementById("zotero-items-toolbar") ??
			document.getElementById("zotero-toolbar");
		const parent = toolbar ?? searchElement?.parentElement ?? document.body;
		if (!parent) {
			this.scheduleReadingBoardButtonRetry();
			return;
		}

		const button =
			parent.namespaceURI == XUL_NS
				? document.createElementNS(XUL_NS, "toolbarbutton")
				: document.createElement("button");
		button.id = READING_BOARD_BUTTON_ID;
		button.textContent = getString("reading-board-button");
		button.setAttribute("label", getString("reading-board-button"));
		button.setAttribute("tooltiptext", getString("reading-board-button"));
		button.setAttribute("type", "button");
		button.setAttribute(
			"style",
			"flex: 0 0 auto; min-width: 118px; margin-inline: 8px;",
		);
		button.addEventListener("click", () => this.openReadingBoard());

		const searchContainer =
			searchElement && parent.contains(searchElement)
				? getDirectChild(parent, searchElement)
				: null;
		const insertBefore =
			searchContainer && searchContainer.parentNode == parent
				? searchContainer
				: null;

		parent.insertBefore(button, insertBefore);
		this.readingBoardButton = button;
	}

	scheduleReadingBoardButtonRetry() {
		if (this.readingBoardButtonRetryIDs.length > 0) {
			return;
		}
		for (const delay of [500, 1500, 3000]) {
			const retryID = window.setTimeout(() => {
				this.readingBoardButtonRetryIDs =
					this.readingBoardButtonRetryIDs.filter(
						(id) => id != retryID,
					);
				this.addReadingBoardButton();
			}, delay);
			this.readingBoardButtonRetryIDs.push(retryID);
		}
	}

	removeReadingBoardButton() {
		for (const retryID of this.readingBoardButtonRetryIDs) {
			window.clearTimeout(retryID);
		}
		this.readingBoardButtonRetryIDs = [];
		this.readingBoardButton?.remove();
		this.readingBoardButton = undefined;
	}

	openReadingBoard() {
		if (!this.readingBoardPanel) {
			const panel = document.createElementNS(
				"http://www.w3.org/1999/xhtml",
				"div",
			);
			panel.id = "zotero-reading-list-board-panel";
			panel.className = "reading-board-panel";
			document.documentElement.append(panel);
			this.readingBoardPanel = panel;
		}
		this.renderReadingBoard();
	}

	closeReadingBoard() {
		this.readingBoardPanel?.remove();
		this.readingBoardPanel = undefined;
	}

	renderReadingBoard() {
		const panel = this.readingBoardPanel;
		if (!panel) {
			return;
		}

		const boardDocument = document;
		panel.replaceChildren();

		const style = boardDocument.createElement("style");
		style.textContent = this.getReadingBoardStyles();
		panel.append(style);

		const root = boardDocument.createElement("main");
		root.className = "reading-board-root";
		panel.append(root);

		const header = boardDocument.createElement("header");
		header.className = "reading-board-header";
		root.append(header);

		const title = boardDocument.createElement("h1");
		title.textContent = getString("reading-board-title");
		header.append(title);

		const headerActions = boardDocument.createElement("div");
		headerActions.className = "reading-board-header-actions";
		header.append(headerActions);

		const refreshButton = boardDocument.createElement("button");
		refreshButton.type = "button";
		refreshButton.textContent = getString("reading-board-refresh");
		refreshButton.addEventListener("click", () =>
			this.renderReadingBoard(),
		);
		headerActions.append(refreshButton);

		const closeButton = boardDocument.createElement("button");
		closeButton.type = "button";
		closeButton.textContent = "Close";
		closeButton.addEventListener("click", () => this.closeReadingBoard());
		headerActions.append(closeButton);

		const items = getCurrentViewItems();
		const board = boardDocument.createElement("section");
		board.className = "reading-board";
		root.append(board);

		const unknownStatuses = Array.from(
			new Set(items.map((item) => getItemReadStatus(item))),
		).filter(
			(statusName) =>
				statusName && !this.statusNames.includes(statusName),
		);
		const laneStatuses = [NO_STATUS].concat(
			this.statusNames,
			unknownStatuses,
		);
		for (const statusName of laneStatuses) {
			this.renderReadingBoardLane(
				boardDocument,
				board,
				statusName,
				items,
			);
		}
	}

	renderReadingBoardLane(
		boardDocument: Document,
		board: HTMLElement,
		statusName: string,
		items: Zotero.Item[],
	) {
		const lane = boardDocument.createElement("section");
		lane.className = statusName
			? "reading-board-lane"
			: "reading-board-lane no-status";
		lane.dataset.statusName = statusName;
		lane.addEventListener("dragover", (event) => {
			event.preventDefault();
		});
		lane.addEventListener("drop", (event) => {
			event.preventDefault();
			const itemID = event.dataTransfer?.getData("text/plain");
			const item = itemID ? Zotero.Items.get(Number(itemID)) : undefined;
			if (!item?.isRegularItem()) {
				return;
			}
			if (statusName) {
				setItemReadStatus(item, statusName);
			} else {
				clearItemReadStatus(item);
			}
			this.renderReadingBoard();
		});
		board.append(lane);

		const header = boardDocument.createElement("div");
		header.className = "reading-board-lane-header";
		lane.append(header);

		const title = boardDocument.createElement("h2");
		title.textContent = statusName
			? this.formatStatusName(statusName)
			: getString("reading-board-no-status");
		header.append(title);

		const laneItems = sortBoardItems(
			items.filter((item) => getItemReadStatus(item) == statusName),
		);

		const count = boardDocument.createElement("span");
		count.textContent = String(laneItems.length);
		header.append(count);

		const cardList = boardDocument.createElement("div");
		cardList.className = "reading-board-card-list";
		lane.append(cardList);

		for (const item of laneItems) {
			cardList.append(this.createReadingBoardCard(boardDocument, item));
		}
	}

	createReadingBoardCard(boardDocument: Document, item: Zotero.Item) {
		const card = boardDocument.createElement("article");
		card.className = "reading-board-card";
		card.draggable = true;
		card.addEventListener("dragstart", (event) => {
			event.dataTransfer?.setData("text/plain", String(item.id));
		});

		const title = boardDocument.createElement("h3");
		title.textContent = getItemTitle(item);
		card.append(title);

		const meta = [getItemAuthors(item), getItemYear(item)]
			.filter(Boolean)
			.join(" - ");
		if (meta) {
			const metaElement = boardDocument.createElement("p");
			metaElement.textContent = meta;
			card.append(metaElement);
		}

		const priorityRow = boardDocument.createElement("label");
		priorityRow.className = "reading-board-priority";
		priorityRow.textContent = getString("priority");
		card.append(priorityRow);

		const prioritySelect = boardDocument.createElement("select");
		priorityRow.append(prioritySelect);

		const emptyOption = boardDocument.createElement("option");
		emptyOption.value = "";
		emptyOption.textContent = getString("priority-none");
		prioritySelect.append(emptyOption);

		for (const priority of PRIORITIES) {
			const option = boardDocument.createElement("option");
			option.value = priority;
			option.textContent = priority;
			prioritySelect.append(option);
		}

		prioritySelect.value = getItemReadPriority(item);
		prioritySelect.addEventListener("change", () => {
			setItemReadPriority(item, prioritySelect.value);
			this.renderReadingBoard();
		});

		return card;
	}

	getReadingBoardStyles() {
		return `
			* {
				box-sizing: border-box;
			}
			.reading-board-panel {
				--rb-bg: #f6f7f8;
				--rb-surface: #ffffff;
				--rb-surface-2: #eef1f4;
				--rb-surface-3: #e3e7eb;
				--rb-border: #d7dbe0;
				--rb-border-strong: #8c949d;
				--rb-text: #202124;
				--rb-muted: #5f6872;
				--rb-accent: #2f80c9;
				--rb-shadow: rgba(0, 0, 0, 0.35);
				position: fixed;
				inset: 48px 24px 24px 24px;
				z-index: 2147483647;
				border: 1px solid var(--rb-border-strong);
				box-shadow: 0 18px 50px var(--rb-shadow);
				background: var(--rb-bg);
				color: var(--rb-text);
				font: menu;
				color-scheme: light dark;
			}
			@media (prefers-color-scheme: dark) {
				.reading-board-panel {
					--rb-bg: #151719;
					--rb-surface: #202326;
					--rb-surface-2: #191c1f;
					--rb-surface-3: #2b3035;
					--rb-border: #34393f;
					--rb-border-strong: #4d555f;
					--rb-text: #e7e9ec;
					--rb-muted: #a7adb5;
					--rb-accent: #4da3ff;
					--rb-shadow: rgba(0, 0, 0, 0.6);
				}
			}
			.reading-board-root {
				height: 100%;
				display: flex;
				flex-direction: column;
			}
			.reading-board-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 12px;
				padding: 10px 14px;
				border-bottom: 1px solid var(--rb-border);
				background: var(--rb-surface);
			}
			.reading-board-header h1 {
				flex: 1;
				margin: 0;
				font-size: 18px;
				font-weight: 600;
			}
			.reading-board-header-actions {
				display: flex;
				gap: 8px;
			}
			.reading-board-header button {
				min-width: 82px;
				padding: 5px 12px;
				border: 1px solid var(--rb-border-strong);
				border-radius: 6px;
				background: var(--rb-surface-3);
				color: var(--rb-text);
				font: menu;
			}
			.reading-board-header button:hover {
				border-color: var(--rb-accent);
			}
			.reading-board {
				display: flex;
				gap: 12px;
				overflow-x: auto;
				padding: 12px;
				flex: 1;
				background: var(--rb-bg);
			}
			.reading-board-lane {
				display: flex;
				flex: 0 0 260px;
				flex-direction: column;
				max-height: calc(100vh - 148px);
				border: 1px solid var(--rb-border);
				border-radius: 8px;
				background: var(--rb-surface-2);
				overflow: hidden;
			}
			.reading-board-lane.no-status {
				flex-basis: 210px;
			}
			.reading-board-lane-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 8px;
				padding: 10px;
				border-bottom: 1px solid var(--rb-border);
				background: var(--rb-surface);
			}
			.reading-board-lane-header h2 {
				margin: 0;
				font-size: 13px;
				font-weight: 600;
			}
			.reading-board-lane-header span {
				min-width: 22px;
				padding: 2px 6px;
				border-radius: 999px;
				background: var(--rb-surface-3);
				text-align: center;
				font-size: 12px;
			}
			.reading-board-card-list {
				display: flex;
				flex-direction: column;
				gap: 8px;
				overflow-y: auto;
				padding: 8px;
			}
			.reading-board-card {
				padding: 11px;
				border: 1px solid var(--rb-border);
				border-radius: 8px;
				background: var(--rb-surface);
				box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
				cursor: grab;
			}
			.reading-board-card:hover {
				border-color: var(--rb-accent);
			}
			.reading-board-card:active {
				cursor: grabbing;
			}
			.reading-board-card h3 {
				margin: 0;
				font-size: 13px;
				line-height: 1.3;
				font-weight: 600;
			}
			.reading-board-card p {
				margin: 6px 0 0;
				color: var(--rb-muted);
				font-size: 12px;
				line-height: 1.35;
			}
			.reading-board-priority {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 8px;
				margin-top: 10px;
				color: var(--rb-muted);
				font-size: 12px;
			}
			.reading-board-priority select {
				min-width: 64px;
				border: 1px solid var(--rb-border);
				border-radius: 6px;
				background: var(--rb-surface-3);
				color: var(--rb-text);
			}
		`;
	}

	addNewItemLabeller() {
		const addItemHandler = (
			action: _ZoteroTypes.Notifier.Event,
			type: _ZoteroTypes.Notifier.Type,
			ids: string[] | number[],
			extraData: _ZoteroTypes.anyObj,
		) => {
			if (action == "add") {
				const items = Zotero.Items.get(ids).filter((item) =>
					item.isRegularItem(),
				);

				setItemsReadStatus(
					items,
					getPref(LABEL_NEW_ITEMS_PREF)! as string,
				);
			}
		};

		this.itemAddedListenerID = Zotero.Notifier.registerObserver(
			{
				notify(...args) {
					// eslint-disable-next-line prefer-spread
					addItemHandler.apply(null, args);
				},
			},
			["item"],
			"zotero-reading-list",
			1,
		);
	}

	removeNewItemLabeller() {
		if (this.itemAddedListenerID) {
			Zotero.Notifier.unregisterObserver(this.itemAddedListenerID);
			this.itemAddedListenerID = undefined;
		}
	}

	addFileOpenedListener() {
		const fileOpenHandler = (
			action: string,
			type: string,
			ids: string[] | number[],
			extraData: any,
		) => {
			if (action == "open") {
				const items = Zotero.Items.getTopLevel(
					Zotero.Items.get(ids as number[]),
				);

				const [statusFrom, statusTo] = prefStringToList(
					getPref(STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF) as string,
				);

				for (const item of items) {
					const itemReadStatusIndex = statusFrom.indexOf(
						getItemReadStatus(item),
					);
					if (itemReadStatusIndex > -1) {
						setItemReadStatus(item, statusTo[itemReadStatusIndex]);
					}
				}
			}
		};

		this.fileOpenedListenerID = Zotero.Notifier.registerObserver(
			{
				notify(...args) {
					// eslint-disable-next-line prefer-spread
					fileOpenHandler.apply(null, args);
				},
			},
			["file"],
			"zotero-reading-list",
			1,
		);
	}

	removeFileOpenedListener() {
		if (this.fileOpenedListenerID) {
			Zotero.Notifier.unregisterObserver(this.fileOpenedListenerID);
			this.fileOpenedListenerID = undefined;
		}
	}

	keyboardEventHandler = (keyboardEvent: KeyboardEvent) => {
		// Check modifiers - want Alt+{1,2,3,4,5} to label the currently selected items
		// Or Alt+0 to clear the current read status
		// Need to use keyboard event `code` instead of `key` to support different keyboard
		// layouts, as well as fix problems with Mac #9 #53
		const possibleKeyCombinations: Map<string, number> = new Map();
		for (let num = 0; num < this.statusNames.length; num++) {
			possibleKeyCombinations.set(`Digit${num + 1}`, num);
			possibleKeyCombinations.set(`Numpad${num + 1}`, num);
		}
		const clearStatusKeyCombinations = ["Digit0", "Numpad0"];
		if (
			!keyboardEvent.ctrlKey &&
			!keyboardEvent.shiftKey &&
			keyboardEvent.altKey
		) {
			if (possibleKeyCombinations.has(keyboardEvent.code)) {
				const selectedStatus =
					this.statusNames[
						possibleKeyCombinations.get(keyboardEvent.code)!
					];
				void setSelectedItemsReadStatus(selectedStatus);
			} else if (
				clearStatusKeyCombinations.includes(keyboardEvent.code)
			) {
				void clearSelectedItemsReadStatus();
			}
		}
	};

	addKeyboardShortcutListener() {
		// disable Zotero's column sorting (also uses Alt+Num shortcut keys) #30
		document
			.getElementById("sortSubmenuKeys")
			?.setAttribute("disabled", "true");
		// different approach compared to Zutilo https://github.com/wshanks/Zutilo/issues/71#issuecomment-360986808
		document.addEventListener("keydown", this.keyboardEventHandler);
	}

	removeKeyboardShortcutListener() {
		document.removeEventListener("keydown", this.keyboardEventHandler);
		// reenable Zotero's column sorting
		document
			.getElementById("sortSubmenuKeys")
			?.setAttribute("disabled", "false");
	}

	removeReadStatusFromExports() {
		// need to specify that `this` is an Object (ie. it's Zotero.Utilities.Internal) for TS to be happy
		$patch$(
			Zotero.Utilities.Internal,
			"itemToExportFormat",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
			(original: Function) =>
				function Zotero_Utilities_Internal_itemToExportFormat(
					this: object,
					zoteroItem: Zotero.Item,
					_legacy: any,
					_skipChildItems: any,
				) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, prefer-rest-params
					const serializedItem = original.apply(this, arguments);
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					if (serializedItem.extra) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						let extraText = serializedItem.extra as string;
						extraText = removeFieldValueFromExtraData(
							extraText,
							READ_STATUS_EXTRA_FIELD,
						);
						extraText = removeFieldValueFromExtraData(
							extraText,
							READ_DATE_EXTRA_FIELD,
						);
						extraText = removeFieldValueFromExtraData(
							extraText,
							READ_PRIORITY_EXTRA_FIELD,
						);
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						serializedItem.extra = extraText;
					}
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return serializedItem;
				},
		);
	}

	unpatchExportFunction() {
		$unpatch$(Zotero.Utilities.Internal, "itemToExportFormat");
	}
}

type ItemOrID = Zotero.Item | number;

type ItemView = {
	getSortedItems?: () => ItemOrID[];
};

type ZoteroPaneLike = {
	getSortedItems?: () => ItemOrID[];
	itemsView?: unknown;
};

function normalizeItems(
	itemsOrIDs: ItemOrID[],
	resolveItemIDs: (ids: number[]) => Zotero.Item[],
) {
	if (!itemsOrIDs.length) {
		return [];
	}
	if (typeof itemsOrIDs[0] == "number") {
		return resolveItemIDs(
			itemsOrIDs.filter(
				(item): item is number => typeof item == "number",
			),
		);
	}
	return itemsOrIDs.filter(
		(item): item is Zotero.Item => typeof item != "number",
	);
}

export function getCurrentViewItems(
	pane: ZoteroPaneLike,
	resolveItemIDs: (ids: number[]) => Zotero.Item[],
	selectedItems: Zotero.Item[],
) {
	const itemView = (pane.itemsView || undefined) as ItemView | undefined;
	const sortedItems = itemView?.getSortedItems?.() ?? pane.getSortedItems?.();
	if (sortedItems) {
		return normalizeItems(sortedItems, resolveItemIDs).filter((item) =>
			item.isRegularItem(),
		);
	}
	return selectedItems.filter((item) => item.isRegularItem());
}

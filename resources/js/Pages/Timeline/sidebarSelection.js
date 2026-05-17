export function selectableSidebarItems(rows) {
    return rows
        .filter((row) => row.kind === 'task' || row.kind === 'group')
        .map((row) => row.item);
}

function itemMap(items) {
    return new Map(items.map((item) => [item.id, item]));
}

function hasSelectedAncestor(itemId, selectedSet, itemsById) {
    let currentParentId = itemsById.get(itemId)?.parent_id ?? null;

    while (currentParentId) {
        if (selectedSet.has(currentParentId)) {
            return true;
        }

        currentParentId = itemsById.get(currentParentId)?.parent_id ?? null;
    }

    return false;
}

export function normalizeSelectedSidebarIds(selectedIds, orderedIds, items) {
    const itemsById = itemMap(items);
    const visibleSelectedSet = new Set(
        orderedIds.filter((itemId, index) => selectedIds.includes(itemId) && orderedIds.indexOf(itemId) === index),
    );

    return orderedIds.filter((itemId) => (
        visibleSelectedSet.has(itemId) && !hasSelectedAncestor(itemId, visibleSelectedSet, itemsById)
    ));
}

export function toggleSidebarSelection(selectedIds, orderedIds, items, itemId) {
    const nextSelectedIds = selectedIds.includes(itemId)
        ? selectedIds.filter((candidateId) => candidateId !== itemId)
        : [...selectedIds, itemId];

    return normalizeSelectedSidebarIds(nextSelectedIds, orderedIds, items);
}

export function extendSidebarSelection(selectedIds, anchorId, targetId, orderedIds, items) {
    const anchorIndex = orderedIds.indexOf(anchorId);
    const targetIndex = orderedIds.indexOf(targetId);

    if (anchorIndex === -1 || targetIndex === -1) {
        return normalizeSelectedSidebarIds([targetId], orderedIds, items);
    }

    const [start, end] = anchorIndex < targetIndex
        ? [anchorIndex, targetIndex]
        : [targetIndex, anchorIndex];
    const rangeIds = orderedIds.slice(start, end + 1);

    return normalizeSelectedSidebarIds(
        Array.from(new Set([...selectedIds, ...rangeIds])),
        orderedIds,
        items,
    );
}

export function sidebarIdsMatch(leftId, rightId) {
    return String(leftId) === String(rightId);
}

export function coerceSidebarHitIds(hitIds, orderedIds) {
    const orderedIdByKey = new Map(orderedIds.map((id) => [String(id), id]));

    return hitIds
        .map((hitId) => orderedIdByKey.get(String(hitId)) ?? null)
        .filter((hitId) => hitId !== null);
}

export function rectsIntersect(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function sidebarIdsInClientRect(clientRect, rowRects) {
    return rowRects
        .filter(({ rect }) => rectsIntersect(clientRect, rect))
        .map(({ id }) => id);
}

export function applyMarqueeSelection(selectedIds, hitIds, orderedIds, items, { shiftKey, metaKey, ctrlKey }) {
    if (metaKey || ctrlKey) {
        let nextSelectedIds = [...selectedIds];

        for (const hitId of hitIds) {
            nextSelectedIds = nextSelectedIds.includes(hitId)
                ? nextSelectedIds.filter((candidateId) => candidateId !== hitId)
                : [...nextSelectedIds, hitId];
        }

        return normalizeSelectedSidebarIds(nextSelectedIds, orderedIds, items);
    }

    if (shiftKey) {
        return normalizeSelectedSidebarIds(
            Array.from(new Set([...selectedIds, ...hitIds])),
            orderedIds,
            items,
        );
    }

    return normalizeSelectedSidebarIds(hitIds, orderedIds, items);
}

export function directBatchCompletionIds(selectedRootIds, items) {
    const itemsById = itemMap(items);
    const completionIds = new Set();

    function collectDescendantTasks(itemId) {
        for (const candidate of items) {
            if (candidate.parent_id !== itemId) {
                continue;
            }

            if (candidate.kind === 'task') {
                completionIds.add(candidate.id);
            }

            collectDescendantTasks(candidate.id);
        }
    }

    for (const selectedId of selectedRootIds) {
        const item = itemsById.get(selectedId);

        if (!item) {
            continue;
        }

        if (item.kind === 'group') {
            collectDescendantTasks(item.id);
            continue;
        }

        completionIds.add(item.id);
    }

    return Array.from(completionIds);
}

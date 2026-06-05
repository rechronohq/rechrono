import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Play, Square } from 'lucide-react';

import { Checkbox } from '../../components/ui/checkbox';
import { cn } from '../../lib/utils';
import { SidebarContextMenu } from './SidebarContextMenu';
import { getSidebarRowActions, getSidebarSelectionActions, splitSidebarRowActions } from './sidebarRowActions';
import { useSidebarMarquee } from './useSidebarMarquee';

const PROJECT_INDENT = 24;
const TASK_INDENT = 20;
const TASK_ROW_BASE_PADDING = 10;

export function TimelineSidebar({
    collapsedGroupIds,
    collapsedProjectIds,
    currentTimer,
    drafts,
    focusedComposerParentId,
    hoveredTaskId,
    isSaving,
    layoutStyle,
    onClearSelection,
    onConvertTaskToGroup,
    onCreateGroup,
    onDraftChange,
    onMarkSelectionComplete,
    onMarkSelectionIncomplete,
    onMarqueeSelect = () => {},
    onOpenProjectModal,
    onReorderTasks,
    onRowClick,
    onSelectProject,
    onSetSingleSelection,
    onSubmitTask,
    onStartTaskTimer,
    onStopTaskTimer,
    onTaskClick,
    onDeleteProject,
    onDeleteTask,
    onDuplicateProject,
    onDuplicateTask,
    onSaveProjectAsTemplate,
    onToggleGroupCollapse,
    onToggleProjectCollapse,
    onToggleComposer,
    onToggleTaskCompletion,
    maxDepth,
    projectCanCollapse,
    rootComposerKey,
    rows,
    selectedItemIds,
    selectedRootIds,
    taskCanAddChildren,
    itemHasChildren,
}) {
    const asideRef = useRef(null);
    const railRef = useRef(null);
    const inputRefs = useRef(new Map());
    const modifierStateRef = useRef({ shiftKey: false, metaKey: false, ctrlKey: false });
    const suppressRowClickRef = useRef(null);
    const suppressClearSelectionRef = useRef(false);
    const dragStateRef = useRef({
        activeId: null,
        activeIds: [],
        overId: null,
        position: null,
    });
    const itemRows = useMemo(() => rows.filter((row) => row.kind === 'task' || row.kind === 'group').map((row) => row.item), [rows]);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const [dragState, setDragState] = useState({
        activeId: null,
        activeIds: [],
        overId: null,
        position: null,
    });
    const [contextMenuState, setContextMenuState] = useState({
        anchor: null,
        open: false,
        rowKey: null,
        mode: 'row',
    });
    const marqueeActiveRef = useRef(false);
    const { handleRailPointerDown, isMarqueeActive, marqueeRect } = useSidebarMarquee({
        activeDragId: dragState.activeId,
        onMarqueeSelect,
        railRef,
        suppressClearSelectionRef,
        suppressRowClickRef,
    });

    useEffect(() => {
        marqueeActiveRef.current = isMarqueeActive;
    }, [isMarqueeActive]);

    useEffect(() => {
        if (focusedComposerParentId === null) {
            return;
        }

        const input = inputRefs.current.get(focusedComposerParentId);

        if (!input) {
            return;
        }

        requestAnimationFrame(() => {
            input.focus();
            input.select();
        });
    }, [focusedComposerParentId, rows]);

    useEffect(() => {
        if (!contextMenuState.open || !contextMenuState.rowKey) {
            return;
        }

        if (!rows.some((row) => row.key === contextMenuState.rowKey)) {
            setContextMenuState({
                anchor: null,
                open: false,
                rowKey: null,
                mode: 'row',
            });
        }
    }, [contextMenuState.open, contextMenuState.rowKey, rows]);

    useEffect(() => {
        if (!selectedRootIds.length) {
            return undefined;
        }

        function onDocumentPointerDown(event) {
            if (event.button !== 0 || marqueeActiveRef.current) {
                return;
            }

            if (suppressClearSelectionRef.current) {
                suppressClearSelectionRef.current = false;

                return;
            }

            const target = event.target;

            if (!(target instanceof Element)) {
                return;
            }

            if (!asideRef.current?.contains(target)) {
                onClearSelection();
            }
        }

        document.addEventListener('pointerdown', onDocumentPointerDown);

        return () => {
            document.removeEventListener('pointerdown', onDocumentPointerDown);
        };
    }, [onClearSelection, selectedRootIds.length]);

    useEffect(() => {
        function syncModifierState(event, nextPressed) {
            if (event.key === 'Shift') {
                modifierStateRef.current.shiftKey = nextPressed;
            }

            if (event.key === 'Meta') {
                modifierStateRef.current.metaKey = nextPressed;
            }

            if (event.key === 'Control') {
                modifierStateRef.current.ctrlKey = nextPressed;
            }
        }

        function onKeyDown(event) {
            syncModifierState(event, true);
        }

        function onKeyUp(event) {
            syncModifierState(event, false);
        }

        function resetModifiers() {
            modifierStateRef.current = { shiftKey: false, metaKey: false, ctrlKey: false };
        }

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', resetModifiers);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', resetModifiers);
        };
    }, []);

    function itemForId(itemId) {
        return itemRows.find((item) => item.id === itemId) ?? null;
    }

    function descendantIdsFor(itemId) {
        const descendants = [];
        const stack = [itemId];

        while (stack.length) {
            const currentId = stack.pop();
            const children = itemRows.filter((item) => item.parent_id === currentId);

            for (const child of children) {
                descendants.push(child.id);
                stack.push(child.id);
            }
        }

        return descendants;
    }

    function subtreeDepthFor(itemId) {
        const baseItem = itemForId(itemId);

        if (!baseItem) {
            return 0;
        }

        let maxDepth = 0;
        const stack = [[itemId, 0]];

        while (stack.length) {
            const [currentId, depth] = stack.pop();
            maxDepth = Math.max(maxDepth, depth);

            for (const child of itemRows.filter((item) => item.parent_id === currentId)) {
                stack.push([child.id, depth + 1]);
            }
        }

        return maxDepth;
    }

    function canReorder(activeItem, overItem) {
        if (!activeItem || !overItem || activeItem.id === overItem.id) {
            return false;
        }

        if (activeItem.project_id !== overItem.project_id) {
            return false;
        }

        if (descendantIdsFor(activeItem.id).includes(overItem.id)) {
            return false;
        }

        if (activeItem.kind === 'group' && (overItem.parent_id ?? null) !== null) {
            return false;
        }

        return overItem.depth + subtreeDepthFor(activeItem.id) <= maxDepth;
    }

    function canReorderSet(activeItems, overItem) {
        if (!activeItems.length || !overItem) {
            return false;
        }

        if (activeItems.some((item) => item.id === overItem.id)) {
            return false;
        }

        return activeItems.every((activeItem) => canReorder(activeItem, overItem));
    }

    function canReparent(activeItem, overItem) {
        if (!activeItem || !overItem || activeItem.id === overItem.id) {
            return false;
        }

        if (activeItem.kind === 'group') {
            return false;
        }

        if (activeItem.project_id !== overItem.project_id) {
            return false;
        }

        if (descendantIdsFor(activeItem.id).includes(overItem.id)) {
            return false;
        }

        return overItem.depth + 1 + subtreeDepthFor(activeItem.id) <= maxDepth;
    }

    function canReparentSet(activeItems, overItem) {
        if (!activeItems.length || !overItem) {
            return false;
        }

        if (activeItems.some((item) => item.id === overItem.id)) {
            return false;
        }

        return activeItems.every((activeItem) => canReparent(activeItem, overItem));
    }

    function parseDropZoneId(zoneId) {
        if (!zoneId || typeof zoneId !== 'string') {
            return {
                overId: null,
                position: null,
            };
        }

        const [prefix, itemId, position] = zoneId.split(':');

        if (prefix !== 'drop' || !itemId || !position) {
            return {
                overId: null,
                position: null,
            };
        }

        return {
            overId: itemId,
            position,
        };
    }

    function resolveDropIntent(activeIds, overZoneId) {
        const resolvedActiveIds = Array.isArray(activeIds) ? activeIds : [activeIds];
        const activeItems = resolvedActiveIds.map((activeId) => itemForId(activeId)).filter(Boolean);
        const { overId: targetItemId, position: zoneKind } = parseDropZoneId(overZoneId);
        const overItem = targetItemId ? itemForId(targetItemId) : null;

        if (!activeItems.length || !overItem || !zoneKind) {
            return {
                activeItems,
                overItem,
                overId: null,
                position: null,
            };
        }

        if (zoneKind === 'into' && canReparentSet(activeItems, overItem)) {
            return {
                activeItems,
                overItem,
                overId: targetItemId,
                position: 'into',
            };
        }

        if (!canReorderSet(activeItems, overItem)) {
            return {
                activeItems,
                overItem,
                overId: null,
                position: null,
            };
        }

        return {
            activeItems,
            overItem,
            overId: targetItemId,
            position: zoneKind,
        };
    }

    function clearDragState() {
        const nextState = {
            activeId: null,
            activeIds: [],
            overId: null,
            position: null,
        };
        dragStateRef.current = nextState;
        setDragState(nextState);
    }

    function updateDragState(nextState) {
        dragStateRef.current = nextState;
        setDragState(nextState);
    }

    function closeContextMenu() {
        setContextMenuState({
            anchor: null,
            open: false,
            rowKey: null,
            mode: 'row',
        });
    }

    function openContextMenu(rowKey, anchor, mode = 'row') {
        setContextMenuState({
            anchor,
            open: true,
            rowKey,
            mode,
        });
    }

    const rowActionHandlers = {
        onClearSelection,
        onConvertTaskToGroup,
        onCreateGroup,
        onDeleteProject,
        onDeleteTask,
        onDuplicateProject,
        onDuplicateTask,
        onMarkSelectionComplete,
        onMarkSelectionIncomplete,
        onSaveProjectAsTemplate,
        onSelectProject,
        onToggleComposer,
        onToggleTaskCompletion,
    };
    const contextMenuRow = contextMenuState.rowKey ? rows.find((row) => row.key === contextMenuState.rowKey) ?? null : null;
    const contextMenuActions = contextMenuState.mode === 'selection' && contextMenuRow?.item && selectedRootIds.includes(contextMenuRow.item.id)
        ? getSidebarSelectionActions(selectedRootIds.length, rowActionHandlers)
        : (contextMenuRow
            ? getSidebarRowActions(
            contextMenuRow,
            rowActionHandlers,
            contextMenuRow.kind === 'task'
                ? { canAddChildren: taskCanAddChildren(contextMenuRow.item) }
                : {},
        )
            : []);

    function modifierIntentForEvent(event) {
        return {
            shiftKey: event.shiftKey || event.nativeEvent?.shiftKey || event.getModifierState?.('Shift') || modifierStateRef.current.shiftKey,
            metaKey: event.metaKey || event.nativeEvent?.metaKey || event.getModifierState?.('Meta') || modifierStateRef.current.metaKey,
            ctrlKey: event.ctrlKey || event.nativeEvent?.ctrlKey || event.getModifierState?.('Control') || modifierStateRef.current.ctrlKey,
        };
    }

    function handleRowPointerDown(item, event) {
        const modifierIntent = modifierIntentForEvent(event);

        if (!(modifierIntent.shiftKey || modifierIntent.metaKey || modifierIntent.ctrlKey)) {
            return false;
        }

        suppressRowClickRef.current = item.id;
        onRowClick(item, modifierIntent);
        event.preventDefault();
        event.stopPropagation();

        return true;
    }

    function handleRowClickCapture(item, event) {
        const modifierIntent = modifierIntentForEvent(event);

        if (!(modifierIntent.shiftKey || modifierIntent.metaKey || modifierIntent.ctrlKey)) {
            return false;
        }

        suppressRowClickRef.current = item.id;
        onRowClick(item, modifierIntent);
        event.preventDefault();
        event.stopPropagation();

        return true;
    }

    function handleRowClick(item, event) {
        if (suppressRowClickRef.current === item.id || suppressRowClickRef.current === '__marquee__') {
            suppressRowClickRef.current = null;

            return;
        }

        onRowClick(item, modifierIntentForEvent(event));
    }

    return (
        <aside
            ref={asideRef}
            style={layoutStyle}
            className={cn('hidden w-[368px] shrink-0 border-r border-stone-200 bg-white lg:block', dragState.activeId && 'timeline-rail-dragging')}
        >
            <div className="timeline-rail-header flex items-center border-b border-stone-200 px-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Projects & Tasks</p>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={({ active }) => {
                    closeContextMenu();
                    const activeIds = selectedRootIds.includes(active.id) ? selectedRootIds : [active.id];

                    if (!selectedRootIds.includes(active.id)) {
                        onSetSingleSelection(active.id);
                    }

                    updateDragState({
                        activeId: active.id,
                        activeIds,
                        overId: null,
                        position: null,
                    });
                }}
                onDragOver={({ active, over }) => {
                    const { overId, position } = resolveDropIntent(dragStateRef.current.activeIds.length ? dragStateRef.current.activeIds : [active.id], over?.id);

                    updateDragState({
                        activeId: active.id,
                        activeIds: dragStateRef.current.activeIds.length ? dragStateRef.current.activeIds : [active.id],
                        overId,
                        position,
                    });
                }}
                onDragCancel={() => {
                    closeContextMenu();
                    clearDragState();
                }}
                onDragEnd={async ({ active, over }) => {
                    closeContextMenu();
                    const activeIds = dragStateRef.current.activeIds.length ? dragStateRef.current.activeIds : [active.id];
                    const { activeItems, overItem, position } = resolveDropIntent(activeIds, over?.id);

                    if (position === 'into' && canReparentSet(activeItems, overItem)) {
                        clearDragState();
                        await onReorderTasks(activeIds, overItem, 'into');

                        return;
                    }

                    if (!canReorderSet(activeItems, overItem)) {
                        clearDragState();

                        return;
                    }

                    clearDragState();
                    await onReorderTasks(activeIds, overItem, position);
                }}
            >
                <div
                    ref={railRef}
                    className="timeline-rail"
                    onPointerDownCapture={handleRailPointerDown}
                    onClick={(event) => {
                        if (suppressClearSelectionRef.current) {
                            suppressClearSelectionRef.current = false;

                            return;
                        }

                        if (event.target === event.currentTarget) {
                            onClearSelection();
                        }
                    }}
                >
                    {rows.map((row, index) => (
                        <div
                            key={`${row.key}-${index}`}
                            className={cn(
                                'timeline-row-shell relative',
                                row.kind === 'project' && 'timeline-project-shell',
                                row.kind === 'group' && 'timeline-group-shell',
                            )}
                        >
                            {row.kind === 'project' && (
                                <div
                                    className={cn(
                                        'group flex h-full w-full items-center border-b border-stone-200/90 text-left transition hover:bg-stone-50/60',
                                        'bg-white',
                                    )}
                                    style={{ paddingLeft: `${8 + (row.project.depth ?? 0) * PROJECT_INDENT}px` }}
                                    onClick={() => {
                                        onClearSelection();
                                        onOpenProjectModal(row.project);
                                    }}
                                    onContextMenu={(event) => {
                                        onClearSelection();
                                        event.preventDefault();
                                        openContextMenu(row.key, {
                                            x: event.clientX,
                                            y: event.clientY,
                                        }, 'row');
                                    }}
                                >
                                    {projectCanCollapse(row.project.id) ? (
                                        <button
                                            type="button"
                                            aria-label={collapsedProjectIds.includes(row.project.id) ? 'Expand project' : 'Collapse project'}
                                            className="mr-1.5 flex h-5 w-5 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-900"
                                            onPointerDown={(event) => event.stopPropagation()}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onToggleProjectCollapse(row.project.id);
                                            }}
                                        >
                                            {collapsedProjectIds.includes(row.project.id) ? (
                                                <ChevronRight className="h-3 w-3" strokeWidth={2.4} />
                                            ) : (
                                                <ChevronDown className="h-3 w-3" strokeWidth={2.4} />
                                            )}
                                        </button>
                                    ) : (
                                        <span className="mr-1.5 w-5" />
                                    )}
                                    <button
                                        type="button"
                                        className="min-w-0 flex-1 py-2 text-left"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onClearSelection();
                                            onOpenProjectModal(row.project);
                                        }}
                                    >
                                        <div className="min-w-0">
                                            <p className={cn(
                                                'truncate',
                                                row.project.depth
                                                    ? 'text-[12.5px] font-semibold tracking-[-0.008em] text-stone-700'
                                                    : 'text-[14px] font-semibold tracking-[-0.014em] text-stone-950',
                                            )}
                                            >
                                                {row.project.name}
                                            </p>
                                        </div>
                                    </button>
                                    <RowActionControls
                                        className="mr-2"
                                        actions={getSidebarRowActions(row, rowActionHandlers)}
                                        menuOpen={contextMenuState.open && contextMenuState.rowKey === row.key}
                                        onCloseMenu={closeContextMenu}
                                        onOpenMenu={(anchor) => openContextMenu(row.key, anchor, 'row')}
                                    />
                                </div>
                            )}

                            {row.kind === 'task' && (
                                <DraggableTreeRow
                                    activeDragId={dragState.activeId}
                                    activeDragIds={dragState.activeIds}
                                    collapsedGroupIds={collapsedGroupIds}
                                    currentTimer={currentTimer}
                                    dropPosition={dragState.activeId && dragState.overId === row.item.id ? dragState.position : null}
                                    item={row.item}
                                    itemHasChildren={itemHasChildren}
                                    hovered={hoveredTaskId === row.item.id}
                                    modifierStateRef={modifierStateRef}
                                    onOpenItem={handleRowClick}
                                    onStartTimer={onStartTaskTimer}
                                    onStopTimer={onStopTaskTimer}
                                    onPointerSelect={handleRowPointerDown}
                                    onToggleCompletion={onToggleTaskCompletion}
                                    onToggleGroupCollapse={onToggleGroupCollapse}
                                    projectDepth={row.project_depth ?? 0}
                                    selected={selectedItemIds.includes(row.item.id)}
                                    selectedRootIds={selectedRootIds}
                                    actions={getSidebarRowActions(row, rowActionHandlers, { canAddChildren: taskCanAddChildren(row.item) })}
                                    menuOpen={contextMenuState.open && contextMenuState.rowKey === row.key}
                                    onCloseMenu={closeContextMenu}
                                    onOpenMenu={(anchor, mode) => openContextMenu(row.key, anchor, mode)}
                                />
                            )}

                            {row.kind === 'group' && (
                                <DraggableTreeRow
                                    activeDragId={dragState.activeId}
                                    activeDragIds={dragState.activeIds}
                                    collapsedGroupIds={collapsedGroupIds}
                                    dropPosition={dragState.activeId && dragState.overId === row.item.id ? dragState.position : null}
                                    item={row.item}
                                    itemHasChildren={itemHasChildren}
                                    hovered={hoveredTaskId === row.item.id}
                                    modifierStateRef={modifierStateRef}
                                    onOpenItem={handleRowClick}
                                    onPointerSelect={handleRowPointerDown}
                                    onToggleCompletion={onToggleTaskCompletion}
                                    onToggleGroupCollapse={onToggleGroupCollapse}
                                    projectDepth={row.project_depth ?? 0}
                                    selected={selectedItemIds.includes(row.item.id)}
                                    selectedRootIds={selectedRootIds}
                                    actions={getSidebarRowActions(row, rowActionHandlers)}
                                    menuOpen={contextMenuState.open && contextMenuState.rowKey === row.key}
                                    onCloseMenu={closeContextMenu}
                                    onOpenMenu={(anchor, mode) => openContextMenu(row.key, anchor, mode)}
                                />
                            )}

                            {row.kind === 'composer' && (
                                <div
                                    className="timeline-composer-row flex h-full items-center px-4"
                                    style={{ paddingLeft: `${TASK_ROW_BASE_PADDING + (row.project_depth ?? 0) * PROJECT_INDENT + row.depth * TASK_INDENT}px` }}
                                    onPointerDown={() => onClearSelection()}
                                >
                                    <input
                                        ref={(element) => {
                                            const key = row.parent_id ?? `root:${row.project_id}`;

                                            if (element) {
                                                inputRefs.current.set(key, element);
                                            } else {
                                                inputRefs.current.delete(key);
                                            }
                                        }}
                                        value={drafts[row.parent_id ?? rootComposerKey(row.project_id)] ?? ''}
                                        type="text"
                                        placeholder="New task"
                                        className="h-7 w-full appearance-none border-0 bg-transparent px-0 text-[12px] text-stone-700 outline-none ring-0 shadow-none transition placeholder:text-stone-400 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:text-stone-900"
                                        onChange={(event) => onDraftChange(row.parent_id ?? rootComposerKey(row.project_id), event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                onSubmitTask(row.parent_id, row.project_id);
                                            }
                                        }}
                                        onBlur={() => onSubmitTask(row.parent_id, row.project_id)}
                                        disabled={isSaving}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </DndContext>
            {marqueeRect && (
                <div
                    aria-hidden
                    className="timeline-marquee-rect"
                    style={{
                        left: marqueeRect.left,
                        top: marqueeRect.top,
                        width: marqueeRect.right - marqueeRect.left,
                        height: marqueeRect.bottom - marqueeRect.top,
                    }}
                />
            )}
            <SidebarContextMenu
                anchor={contextMenuState.anchor}
                actions={contextMenuActions}
                open={contextMenuState.open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        closeContextMenu();
                    }
                }}
            />
        </aside>
    );
}

function DraggableTreeRow({
    activeDragId,
    activeDragIds,
    collapsedGroupIds,
    currentTimer,
    dropPosition,
    actions,
    hovered,
    item,
    itemHasChildren,
    onCloseMenu,
    onOpenItem,
    onOpenMenu,
    onPointerSelect,
    onStartTimer,
    onStopTimer,
    onToggleCompletion,
    onToggleGroupCollapse,
    projectDepth,
    menuOpen,
    modifierStateRef,
    selectedRootIds,
    selected,
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
    const hasChildren = itemHasChildren(item.id);
    const isGroup = item.kind === 'group';
    const activeSetIncludesItem = activeDragIds?.includes(item.id);
    const isTimerRunning = currentTimer?.task_id === item.id && currentTimer?.is_running;

    return (
        <div
            ref={setNodeRef}
            className="relative h-full"
            data-testid="sidebar-task-row"
            data-selected={selected ? 'true' : 'false'}
            data-hovered={hovered ? 'true' : 'false'}
            data-task-id={item.id}
            data-task-name={item.name}
            data-task-depth={item.depth}
            style={{
                transform: isDragging ? CSS.Translate.toString(transform) : undefined,
                zIndex: isDragging ? 20 : 'auto',
                pointerEvents: isDragging ? 'none' : undefined,
            }}
        >
            <div className={cn('absolute inset-0 z-[12] hidden timeline-drop-zones', activeDragId && !activeSetIncludesItem && 'block')}>
                <DropZone id={`drop:${item.id}:before`} className="absolute inset-x-0 -top-2 h-4" />
                <DropZone id={`drop:${item.id}:into`} className="absolute inset-x-2 top-1 bottom-1 rounded-sm" />
                <DropZone id={`drop:${item.id}:after`} className="absolute inset-x-0 -bottom-2 h-4" />
            </div>

            {dropPosition && dropPosition !== 'into' && (
                <div
                    className={cn(
                        'pointer-events-none absolute left-3 right-3 z-10 h-0.5 rounded-full bg-stone-900/65',
                        dropPosition === 'before' ? 'top-0' : 'bottom-0',
                    )}
                />
            )}

            <div
                className={cn(
                    'timeline-tree-row group relative z-[2] flex h-full items-center pr-4 text-[12.5px]',
                    isGroup && 'timeline-tree-row-group',
                    item.completed ? 'text-stone-500' : 'text-stone-700',
                    selected && 'timeline-tree-row-selected',
                    hovered && 'timeline-tree-row-hovered',
                    dropPosition === 'into' && 'timeline-drop-into',
                    isDragging && 'opacity-80 shadow-[0_12px_30px_rgba(28,25,23,0.08)]',
                    !isDragging && 'timeline-tree-row-interactive',
                )}
                data-hovered={hovered ? 'true' : 'false'}
                data-task-id={item.id}
                onPointerDownCapture={(event) => {
                    onPointerSelect?.(item, event);
                }}
                onMouseDownCapture={(event) => {
                    onPointerSelect?.(item, event);
                }}
                onClickCapture={(event) => {
                    onPointerSelect?.(item, event);
                }}
                onClick={(event) => onOpenItem(item, {
                    ...event,
                    shiftKey: event.shiftKey || modifierStateRef?.current.shiftKey,
                    metaKey: event.metaKey || modifierStateRef?.current.metaKey,
                    ctrlKey: event.ctrlKey || modifierStateRef?.current.ctrlKey,
                })}
                onContextMenu={(event) => {
                    event.preventDefault();
                    onOpenMenu?.({
                        x: event.clientX,
                        y: event.clientY,
                    }, selectedRootIds?.includes(item.id) ? 'selection' : 'row');
                }}
            >
                <button
                    type="button"
                    aria-label="Reorder task"
                    data-marquee-ignore
                    className={cn(
                        'timeline-row-drag-handle inline-flex h-5 w-4 shrink-0 items-center justify-center rounded-md text-stone-300 transition',
                        'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto',
                        'group-focus-within:opacity-100 group-focus-within:pointer-events-auto',
                        selected && 'opacity-100 pointer-events-auto',
                        isDragging && 'text-stone-500',
                    )}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
                <div
                    className="flex min-w-0 flex-1 items-center gap-2"
                    style={{ paddingLeft: `${TASK_ROW_BASE_PADDING + 24 + projectDepth * PROJECT_INDENT + item.depth * TASK_INDENT}px` }}
                >
                    {isGroup ? (
                        <button
                            type="button"
                            aria-label={hasChildren ? (collapsedGroupIds.includes(item.id) ? 'Expand group' : 'Collapse group') : undefined}
                            data-marquee-ignore
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-900"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                onToggleGroupCollapse(item.id);
                            }}
                        >
                            {hasChildren ? (
                                collapsedGroupIds.includes(item.id) ? (
                                    <ChevronRight className="h-3 w-3" strokeWidth={2.4} />
                                ) : (
                                    <ChevronDown className="h-3 w-3" strokeWidth={2.4} />
                                )
                            ) : (
                                <span className="h-5 w-5 shrink-0" />
                            )}
                        </button>
                    ) : (
                        <div
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <Checkbox checked={item.completed} onCheckedChange={(checked) => onToggleCompletion(item, checked)} />
                        </div>
                    )}
                    <span
                        className={cn(
                            'min-w-0 flex-1 truncate',
                            isGroup
                                ? 'text-[13px] font-semibold tracking-[-0.012em] text-stone-900'
                                : (item.completed ? 'text-stone-500' : 'text-stone-800'),
                        )}
                    >
                        {item.name}
                    </span>
                    {!isGroup && (onStartTimer || onStopTimer) ? (
                        <button
                            type="button"
                            aria-label={isTimerRunning ? 'Stop timer' : 'Start timer'}
                            title={isTimerRunning ? 'Stop timer' : 'Start timer'}
                            data-marquee-ignore
                            className={cn(
                                'timeline-row-action-button inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-transparent opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto',
                                isTimerRunning
                                    ? 'bg-blue-50 text-blue-700 opacity-100 pointer-events-auto hover:bg-blue-100'
                                    : 'text-stone-400 hover:bg-stone-100 hover:text-stone-900',
                            )}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                if (isTimerRunning) {
                                    onStopTimer?.();
                                } else {
                                    onStartTimer?.(item);
                                }
                            }}
                        >
                            {isTimerRunning ? <Square className="h-3 w-3" /> : <Play className="h-3.5 w-3.5" />}
                        </button>
                    ) : null}
                    <RowActionControls
                        actions={actions}
                        className="ml-auto"
                        menuOpen={menuOpen}
                        onCloseMenu={onCloseMenu}
                        onOpenMenu={onOpenMenu}
                    />
                </div>
            </div>
        </div>
    );
}

function RowActionControls({ actions, className, menuOpen, onCloseMenu, onOpenMenu }) {
    const { inlineAction, menuActions } = splitSidebarRowActions(actions);

    if (!inlineAction && !menuActions.length) {
        return null;
    }

    return (
        <div className={cn('flex items-center gap-1', className)} data-marquee-ignore>
            {inlineAction && (
                <button
                    type="button"
                    aria-label={inlineAction.label}
                    title={inlineAction.label}
                    className="timeline-row-action-button inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-transparent text-stone-400 opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto hover:bg-stone-100 hover:text-stone-900"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        onCloseMenu?.();
                        inlineAction.onSelect?.();
                    }}
                >
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                </button>
            )}

            {menuActions.length > 0 && (
                <button
                    type="button"
                    aria-label="More actions"
                    title="More actions"
                    aria-expanded={menuOpen ? 'true' : 'false'}
                    className="timeline-row-action-button inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-transparent text-stone-400 opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto hover:bg-stone-100 hover:text-stone-900"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();
                        onOpenMenu?.({
                            x: rect.right + 4,
                            y: rect.bottom + 4,
                        });
                    }}
                    onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();
                        onOpenMenu?.({
                            x: rect.right + 4,
                            y: rect.bottom + 4,
                        });
                    }}
                >
                    <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2.4} />
                </button>
            )}
        </div>
    );
}

function DropZone({ className, id }) {
    const { setNodeRef } = useDroppable({ id });
    const [, itemId, position] = id.split(':');

    return <div ref={setNodeRef} className={className} data-testid="sidebar-drop-zone" data-task-id={itemId} data-zone-kind={position} />;
}

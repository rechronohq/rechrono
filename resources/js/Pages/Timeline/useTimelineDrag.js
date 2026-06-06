import { useEffect, useRef } from 'react';

import { request, shiftDate, shiftVisibleDate, taskUrl } from './utils';

export function useTimelineDrag({
    columnWidth,
    dataRef,
    setData,
    setDependencyDragState,
    updateTaskUrlTemplate,
}) {
    const dragStateRef = useRef(null);
    const lastCompletedDragRef = useRef({
        taskId: null,
        at: 0,
    });

    useEffect(() => {
        function updateDependencyTarget(clientX, clientY, dragState) {
            if (dragState.mode !== 'move' || isSummaryTask(dragState.originalTask)) {
                setDependencyDragState({
                    activeTaskId: null,
                    targetTaskId: null,
                    clearCandidate: false,
                });

                return;
            }

            const element = document.elementFromPoint(clientX, clientY);
            const targetElement = element?.closest?.('[data-task-bar-id]');
            const targetTaskId = targetElement?.getAttribute?.('data-task-bar-id') ?? null;
            const isValidTarget = targetTaskId !== null && canSetDependency(dragState, targetTaskId);
            const clearCandidate = Boolean(
                dragState.originalTask.dependency_id !== null
                && dragState.pointerMoved
                && ! isValidTarget,
            );

            const nextState = {
                activeTaskId: dragState.taskId,
                targetTaskId: isValidTarget ? targetTaskId : null,
                clearCandidate,
            };

            dragState.targetTaskId = nextState.targetTaskId;
            dragState.clearCandidate = clearCandidate;
            setDependencyDragState(nextState);
        }

        function onPointerMove(event) {
            const dragState = dragStateRef.current;

            if (!dragState) {
                return;
            }

            const deltaDays = Math.round((event.clientX - dragState.startX) / dragState.columnWidth);
            dragState.pointerMoved = dragState.pointerMoved
                || Math.abs(event.clientX - dragState.startX) > 6
                || Math.abs(event.clientY - dragState.startY) > 6;

            if (deltaDays !== dragState.deltaDays) {
                dragState.deltaDays = deltaDays;

                setData((previous) => {
                    const nextData = {
                        ...previous,
                        items: previous.items.map((item) => {
                            const next = { ...dragState.original.get(item.id) };

                            if (item.id === dragState.taskId) {
                                if (dragState.mode === 'resize_left') {
                                    const start = dragState.showWeekends ? shiftDate(next.start, deltaDays) : shiftVisibleDate(next.start, deltaDays, false);
                                    next.start = start > next.end ? next.end : start;
                                } else if (dragState.mode === 'resize_right') {
                                    const end = dragState.showWeekends ? shiftDate(next.end, deltaDays) : shiftVisibleDate(next.end, deltaDays, false);
                                    next.end = end < next.start ? next.start : end;
                                } else {
                                    next.start = dragState.showWeekends ? shiftDate(next.start, deltaDays) : shiftVisibleDate(next.start, deltaDays, false);
                                    next.end = dragState.showWeekends ? shiftDate(next.end, deltaDays) : shiftVisibleDate(next.end, deltaDays, false);
                                }
                            } else if (dragState.mode === 'move' && dragState.descendantIds.includes(item.id)) {
                                next.start = dragState.showWeekends ? shiftDate(next.start, deltaDays) : shiftVisibleDate(next.start, deltaDays, false);
                                next.end = dragState.showWeekends ? shiftDate(next.end, deltaDays) : shiftVisibleDate(next.end, deltaDays, false);
                            }

                            return next;
                        }),
                    };

                    dataRef.current = nextData;

                    return nextData;
                });
            }

            updateDependencyTarget(event.clientX, event.clientY, dragState);
        }

        async function onPointerUp(event) {
            const state = dragStateRef.current;

            if (!state) {
                return;
            }

            dragStateRef.current = null;
            state.captureTarget?.releasePointerCapture?.(state.pointerId);

            const task = dataRef.current.items.find((item) => item.id === state.taskId) ?? null;

            setDependencyDragState({
                activeTaskId: null,
                targetTaskId: null,
                clearCandidate: false,
            });

            if (state.pointerMoved) {
                lastCompletedDragRef.current = {
                    taskId: state.taskId,
                    at: Date.now(),
                };
            }

            if (!task) {
                return;
            }

            if (state.mode === 'move' && !isSummaryTask(state.originalTask) && state.targetTaskId) {
                const payload = await request(taskUrl(updateTaskUrlTemplate, task.project_id, task.id), {
                    method: 'PATCH',
                    body: JSON.stringify({
                        dependency_id: state.targetTaskId,
                        interaction: 'dependency_set',
                        selected_project_ids: dataRef.current.selected_project_ids,
                        selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                        show_weekends: dataRef.current.show_weekends ?? false,
                    }),
                });

                dataRef.current = payload;
                setData(payload);

                return;
            }

            if (state.mode === 'move' && !isSummaryTask(state.originalTask) && state.clearCandidate) {
                const payload = await request(taskUrl(updateTaskUrlTemplate, task.project_id, task.id), {
                    method: 'PATCH',
                    body: JSON.stringify({
                        start_date: task.start,
                        end_date: task.end,
                        dependency_id: null,
                        interaction: 'dependency_clear',
                        selected_project_ids: dataRef.current.selected_project_ids,
                        selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                        show_weekends: dataRef.current.show_weekends ?? false,
                    }),
                });

                dataRef.current = payload;
                setData(payload);

                return;
            }

            if (!state.deltaDays) {
                setData(() => {
                    const nextData = {
                        ...dataRef.current,
                        items: [...state.original.values()],
                    };

                    dataRef.current = nextData;

                    return nextData;
                });

                return;
            }

            const payload = await request(taskUrl(updateTaskUrlTemplate, task.project_id, task.id), {
                method: 'PATCH',
                body: JSON.stringify({
                    start_date: task.start,
                    end_date: task.end,
                    interaction: state.mode,
                    timeline_delta_days: state.mode === 'move' ? state.deltaDays : undefined,
                    selected_project_ids: dataRef.current.selected_project_ids,
                    selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                    show_weekends: dataRef.current.show_weekends ?? false,
                }),
            });

            dataRef.current = payload;
            setData(payload);
        }

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [dataRef, setData, setDependencyDragState, updateTaskUrlTemplate]);

    function startDrag(event, task, mode, descendants, ancestors) {
        event.preventDefault();
        event.currentTarget?.setPointerCapture?.(event.pointerId);

        dragStateRef.current = {
            taskId: task.id,
            mode,
            columnWidth,
            startX: event.clientX,
            startY: event.clientY,
            original: new Map(dataRef.current.items.map((item) => [item.id, { ...item }])),
            originalTask: { ...task },
            descendantIds: mode === 'move' ? descendants.map((item) => item.id) : [],
            ancestorIds: mode === 'move' ? ancestors : [],
            pointerId: event.pointerId,
            captureTarget: event.currentTarget,
            deltaDays: 0,
            pointerMoved: false,
            targetTaskId: null,
            clearCandidate: false,
            showWeekends: dataRef.current.show_weekends ?? false,
        };
    }

    return {
        shouldSuppressClick(taskId) {
            return lastCompletedDragRef.current.taskId === taskId
                && (Date.now() - lastCompletedDragRef.current.at) < 350;
        },
        startDrag,
    };
}

function isSummaryTask(task) {
    return task.kind === 'group' || Boolean(task.has_children);
}

function canSetDependency(dragState, targetTaskId) {
    if (targetTaskId === dragState.taskId) {
        return false;
    }

    if (dragState.descendantIds.includes(targetTaskId) || dragState.ancestorIds.includes(targetTaskId)) {
        return false;
    }

    const targetTask = dragState.original.get(targetTaskId);

    if (!targetTask || targetTask.project_id !== dragState.originalTask.project_id) {
        return false;
    }

    let currentDependencyId = targetTask.dependency_id;

    while (currentDependencyId !== null) {
        if (currentDependencyId === dragState.taskId) {
            return false;
        }

        currentDependencyId = dragState.original.get(currentDependencyId)?.dependency_id ?? null;
    }

    return true;
}

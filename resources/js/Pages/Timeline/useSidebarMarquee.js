import { useCallback, useRef, useState } from 'react';

import { sidebarIdsInClientRect } from './sidebarSelection';

const MARQUEE_DRAG_THRESHOLD_PX = 4;
const AUTO_SCROLL_EDGE_PX = 24;
const AUTO_SCROLL_STEP_PX = 12;

function normalizeClientRect(originX, originY, currentX, currentY) {
    return {
        left: Math.min(originX, currentX),
        top: Math.min(originY, currentY),
        right: Math.max(originX, currentX),
        bottom: Math.max(originY, currentY),
    };
}

function distanceBetweenPoints(originX, originY, currentX, currentY) {
    const deltaX = currentX - originX;
    const deltaY = currentY - originY;

    return Math.hypot(deltaX, deltaY);
}

function isMarqueeIgnoredTarget(target) {
    if (!(target instanceof Element)) {
        return true;
    }

    if (target.closest('[data-marquee-ignore]')) {
        return true;
    }

    if (target.closest('.timeline-project-shell, .timeline-composer-row')) {
        return true;
    }

    return false;
}

function collectSidebarRowRects(railElement) {
    return Array.from(railElement.querySelectorAll('[data-testid="sidebar-task-row"]'))
        .map((element) => {
            const taskId = element.getAttribute('data-task-id');

            if (!taskId) {
                return null;
            }

            const measureTarget = element.querySelector('.timeline-tree-row') ?? element;

            return {
                id: taskId,
                rect: measureTarget.getBoundingClientRect(),
            };
        })
        .filter(Boolean);
}

export function useSidebarMarquee({
    activeDragId,
    onMarqueeSelect,
    railRef,
    suppressClearSelectionRef,
    suppressRowClickRef,
}) {
    const [marqueeState, setMarqueeState] = useState(null);
    const marqueeStateRef = useRef(null);
    const autoScrollFrameRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const listenersRef = useRef(null);

    const updateMarqueeState = useCallback((nextState) => {
        marqueeStateRef.current = nextState;
        setMarqueeState(nextState);
    }, []);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollFrameRef.current !== null) {
            cancelAnimationFrame(autoScrollFrameRef.current);
            autoScrollFrameRef.current = null;
        }
    }, []);

    const detachListeners = useCallback(() => {
        if (!listenersRef.current) {
            return;
        }

        const { onPointerMove, onPointerUp, onPointerCancel } = listenersRef.current;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
        listenersRef.current = null;
    }, []);

    const activateMarqueeDrag = useCallback((state, event) => {
        const railElement = railRef.current;

        if (!railElement || state.dragging) {
            return state;
        }

        event.preventDefault();
        railElement.setPointerCapture(event.pointerId);
        document.body.style.userSelect = 'none';

        return {
            ...state,
            dragging: true,
        };
    }, [railRef]);

    const finishMarquee = useCallback((event) => {
        const state = marqueeStateRef.current;

        detachListeners();
        stopAutoScroll();
        document.body.style.removeProperty('user-select');

        if (!state) {
            updateMarqueeState(null);

            return;
        }

        const railElement = railRef.current;

        if (state.dragging && railElement) {
            const dragDistance = distanceBetweenPoints(
                state.originX,
                state.originY,
                state.currentX,
                state.currentY,
            );

            if (dragDistance >= MARQUEE_DRAG_THRESHOLD_PX) {
                const selectionRect = normalizeClientRect(
                    state.originX,
                    state.originY,
                    state.currentX,
                    state.currentY,
                );
                const hitIds = sidebarIdsInClientRect(selectionRect, collectSidebarRowRects(railElement));

                onMarqueeSelect(hitIds, {
                    shiftKey: state.shiftKey,
                    metaKey: state.metaKey,
                    ctrlKey: state.ctrlKey,
                });

                if (suppressRowClickRef) {
                    suppressRowClickRef.current = '__marquee__';
                }

                if (suppressClearSelectionRef) {
                    suppressClearSelectionRef.current = true;
                }
            }
        }

        if (railElement?.hasPointerCapture?.(event.pointerId)) {
            railElement.releasePointerCapture(event.pointerId);
        }

        updateMarqueeState(null);
    }, [
        detachListeners,
        onMarqueeSelect,
        railRef,
        stopAutoScroll,
        suppressClearSelectionRef,
        suppressRowClickRef,
        updateMarqueeState,
    ]);

    const tickAutoScroll = useCallback(() => {
        const state = marqueeStateRef.current;
        const scrollContainer = scrollContainerRef.current;

        if (!state?.dragging || !scrollContainer) {
            autoScrollFrameRef.current = null;

            return;
        }

        const bounds = scrollContainer.getBoundingClientRect();
        let scrollDelta = 0;

        if (state.currentY < bounds.top + AUTO_SCROLL_EDGE_PX) {
            scrollDelta = -AUTO_SCROLL_STEP_PX;
        } else if (state.currentY > bounds.bottom - AUTO_SCROLL_EDGE_PX) {
            scrollDelta = AUTO_SCROLL_STEP_PX;
        }

        if (scrollDelta !== 0) {
            scrollContainer.scrollTop += scrollDelta;
        }

        autoScrollFrameRef.current = requestAnimationFrame(tickAutoScroll);
    }, []);

    const attachListeners = useCallback(() => {
        if (listenersRef.current) {
            return;
        }

        function onPointerMove(event) {
            let state = marqueeStateRef.current;

            if (!state) {
                return;
            }

            const nextCurrent = {
                currentX: event.clientX,
                currentY: event.clientY,
            };

            if (!state.dragging) {
                const dragDistance = distanceBetweenPoints(
                    state.originX,
                    state.originY,
                    nextCurrent.currentX,
                    nextCurrent.currentY,
                );

                if (dragDistance < MARQUEE_DRAG_THRESHOLD_PX) {
                    updateMarqueeState({
                        ...state,
                        ...nextCurrent,
                    });

                    return;
                }

                state = activateMarqueeDrag({
                    ...state,
                    ...nextCurrent,
                }, event);
                updateMarqueeState(state);
            } else {
                updateMarqueeState({
                    ...state,
                    ...nextCurrent,
                });
            }

            if (autoScrollFrameRef.current === null && marqueeStateRef.current?.dragging) {
                autoScrollFrameRef.current = requestAnimationFrame(tickAutoScroll);
            }
        }

        function onPointerUp(event) {
            finishMarquee(event);
        }

        function onPointerCancel(event) {
            finishMarquee(event);
        }

        listenersRef.current = { onPointerMove, onPointerUp, onPointerCancel };
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerCancel);
    }, [activateMarqueeDrag, finishMarquee, tickAutoScroll, updateMarqueeState]);

    const handleRailPointerDown = useCallback((event) => {
        if (event.button !== 0 || activeDragId) {
            return;
        }

        if (isMarqueeIgnoredTarget(event.target)) {
            return;
        }

        if ((event.shiftKey || event.metaKey || event.ctrlKey) && event.target instanceof Element && event.target.closest('.timeline-tree-row')) {
            return;
        }

        const railElement = railRef.current;

        if (!railElement) {
            return;
        }

        scrollContainerRef.current = railElement.closest('.timeline-scroll');

        updateMarqueeState({
            dragging: false,
            originX: event.clientX,
            originY: event.clientY,
            currentX: event.clientX,
            currentY: event.clientY,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
        });
        attachListeners();
    }, [activeDragId, attachListeners, railRef, updateMarqueeState]);

    const marqueeRect = marqueeState?.dragging
        ? normalizeClientRect(
            marqueeState.originX,
            marqueeState.originY,
            marqueeState.currentX,
            marqueeState.currentY,
        )
        : null;

    return {
        handleRailPointerDown,
        isMarqueeActive: Boolean(marqueeState?.dragging),
        marqueeRect,
    };
}

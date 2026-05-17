import { useCallback, useRef, useState } from 'react';

const MARQUEE_DRAG_THRESHOLD_PX = 4;

function normalizeClientRect(originX, originY, currentX, currentY) {
    return {
        left: Math.min(originX, currentX),
        top: Math.min(originY, currentY),
        right: Math.max(originX, currentX),
        bottom: Math.max(originY, currentY),
    };
}

function rectsIntersect(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function distanceBetweenPoints(originX, originY, currentX, currentY) {
    const deltaX = currentX - originX;
    const deltaY = currentY - originY;

    return Math.hypot(deltaX, deltaY);
}

function collectTaskRowRects(containerElement) {
    return Array.from(containerElement.querySelectorAll('[data-project-task-id][data-selectable="true"]'))
        .map((element) => ({
            id: element.getAttribute('data-project-task-id'),
            rect: element.getBoundingClientRect(),
        }))
        .filter(({ id }) => id !== null);
}

function isIgnoredTarget(target) {
    if (!(target instanceof Element)) {
        return true;
    }

    if (!target.closest('.projects-detail-task')) {
        return true;
    }

    return Boolean(target.closest('[data-marquee-ignore]'));
}

export function useProjectTaskMarquee({ containerRef, onSelect, suppressTaskClickRef }) {
    const [marqueeState, setMarqueeState] = useState(null);
    const marqueeStateRef = useRef(null);
    const listenersRef = useRef(null);

    const updateMarqueeState = useCallback((nextState) => {
        marqueeStateRef.current = nextState;
        setMarqueeState(nextState);
    }, []);

    const detachListeners = useCallback(() => {
        if (!listenersRef.current) {
            return;
        }

        const { onPointerCancel, onPointerMove, onPointerUp } = listenersRef.current;
        window.removeEventListener('pointercancel', onPointerCancel);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        listenersRef.current = null;
    }, []);

    const activateMarqueeDrag = useCallback((state, event) => {
        const containerElement = containerRef.current;

        if (!containerElement || state.dragging) {
            return state;
        }

        event.preventDefault();
        containerElement.setPointerCapture?.(event.pointerId);
        document.body.style.userSelect = 'none';

        return {
            ...state,
            dragging: true,
        };
    }, [containerRef]);

    const finishMarquee = useCallback((event) => {
        const state = marqueeStateRef.current;
        const containerElement = containerRef.current;

        detachListeners();
        document.body.style.removeProperty('user-select');

        if (state?.dragging && containerElement) {
            const dragDistance = distanceBetweenPoints(state.originX, state.originY, state.currentX, state.currentY);

            if (dragDistance >= MARQUEE_DRAG_THRESHOLD_PX) {
                const selectionRect = normalizeClientRect(state.originX, state.originY, state.currentX, state.currentY);
                const hitIds = collectTaskRowRects(containerElement)
                    .filter(({ rect }) => rectsIntersect(selectionRect, rect))
                    .map(({ id }) => id);

                onSelect(hitIds, {
                    ctrlKey: state.ctrlKey,
                    metaKey: state.metaKey,
                    shiftKey: state.shiftKey,
                });

                if (suppressTaskClickRef) {
                    suppressTaskClickRef.current = true;
                }
            }
        }

        if (containerElement?.hasPointerCapture?.(event.pointerId)) {
            containerElement.releasePointerCapture(event.pointerId);
        }

        updateMarqueeState(null);
    }, [containerRef, detachListeners, onSelect, suppressTaskClickRef, updateMarqueeState]);

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
            } else {
                state = {
                    ...state,
                    ...nextCurrent,
                };
            }

            updateMarqueeState(state);
        }

        function onPointerUp(event) {
            finishMarquee(event);
        }

        function onPointerCancel(event) {
            finishMarquee(event);
        }

        listenersRef.current = { onPointerCancel, onPointerMove, onPointerUp };
        window.addEventListener('pointercancel', onPointerCancel);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }, [activateMarqueeDrag, finishMarquee, updateMarqueeState]);

    const handlePointerDownCapture = useCallback((event) => {
        if (event.button !== 0 || isIgnoredTarget(event.target)) {
            return;
        }

        updateMarqueeState({
            ctrlKey: event.ctrlKey,
            currentX: event.clientX,
            currentY: event.clientY,
            dragging: false,
            metaKey: event.metaKey,
            originX: event.clientX,
            originY: event.clientY,
            shiftKey: event.shiftKey,
        });
        attachListeners();
    }, [attachListeners, updateMarqueeState]);

    const marqueeRect = marqueeState?.dragging
        ? normalizeClientRect(marqueeState.originX, marqueeState.originY, marqueeState.currentX, marqueeState.currentY)
        : null;

    return {
        handlePointerDownCapture,
        marqueeRect,
    };
}

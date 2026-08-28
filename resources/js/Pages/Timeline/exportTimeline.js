const SIDEBAR_WIDTH = 368;
const MAX_CANVAS_EDGE = 16_384;
const MAX_CANVAS_PIXELS = 64_000_000;
const MAX_PDF_EDGE = 14_400;
const TARGET_PIXEL_RATIO = 2;
const MIN_PIXEL_RATIO = 0.5;

export function timelineExportFilename({ activeViewName = '', selectedProjectName = '', date = new Date() } = {}) {
    const baseName = activeViewName || selectedProjectName || 'timeline';
    const safeName = baseName
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-')
        .toLowerCase() || 'timeline';
    const datePart = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');

    return `${safeName}-${datePart}`;
}

export function timelineExportDimensions({ headerHeight, rowCount, rowHeight, timelineWidth }) {
    return {
        width: SIDEBAR_WIDTH + timelineWidth,
        height: headerHeight + (rowCount * rowHeight),
    };
}

export function timelineExportPixelRatio(width, height) {
    const edgeRatio = Math.min(MAX_CANVAS_EDGE / width, MAX_CANVAS_EDGE / height);
    const areaRatio = Math.sqrt(MAX_CANVAS_PIXELS / (width * height));

    return Math.min(TARGET_PIXEL_RATIO, edgeRatio, areaRatio);
}

export function timelinePdfDimensions(width, height) {
    const scale = Math.min(1, MAX_PDF_EDGE / Math.max(width, height));

    return {
        width: width * scale,
        height: height * scale,
    };
}

export async function exportTimeline({ element, format, filename, headerHeight, rowCount, rowHeight, timelineWidth }) {
    if (!element) {
        throw new Error('The timeline is not ready to export.');
    }

    const composerRowCount = element.querySelectorAll('.timeline-composer-row').length;
    const exportRowCount = Math.max(0, rowCount - composerRowCount);
    const dimensions = timelineExportDimensions({ headerHeight, rowCount: exportRowCount, rowHeight, timelineWidth });
    const pixelRatio = timelineExportPixelRatio(dimensions.width, dimensions.height);

    if (pixelRatio < MIN_PIXEL_RATIO) {
        throw new Error('This timeline is too large to export clearly. Narrow the project filters or collapse some groups and try again.');
    }

    const { clone, host } = prepareExportClone(element, { ...dimensions, rowHeight, timelineWidth });
    document.body.appendChild(host);

    try {
        const { toPng } = await import('html-to-image');
        await document.fonts?.ready;
        await nextPaint();

        const dataUrl = await toPng(clone, {
            backgroundColor: '#ffffff',
            cacheBust: true,
            height: dimensions.height,
            pixelRatio,
            skipAutoScale: true,
            width: dimensions.width,
        });

        if (format === 'png') {
            downloadDataUrl(dataUrl, `${filename}.png`);

            return;
        }

        if (format !== 'pdf') {
            throw new Error(`Unsupported timeline export format: ${format}`);
        }

        const { jsPDF } = await import('jspdf');
        const page = timelinePdfDimensions(dimensions.width, dimensions.height);
        const pdf = new jsPDF({
            compress: true,
            format: [page.width, page.height],
            hotfixes: ['px_scaling'],
            orientation: page.width >= page.height ? 'landscape' : 'portrait',
            unit: 'px',
        });

        pdf.addImage(dataUrl, 'PNG', 0, 0, page.width, page.height, undefined, 'FAST');
        pdf.save(`${filename}.pdf`);
    } finally {
        host.remove();
    }
}

function prepareExportClone(element, { height, rowHeight, timelineWidth, width }) {
    const clone = element.cloneNode(true);
    const host = document.createElement('div');
    const sourceStyles = window.getComputedStyle(element);
    const density = element.closest('.timeline-shell')?.dataset.density;

    clone.setAttribute('aria-hidden', 'true');
    clone.classList.add('timeline-export-surface', 'timeline-shell');
    if (density) {
        clone.dataset.density = density;
    }
    ['--timeline-day-height', '--timeline-header-height', '--timeline-month-height', '--timeline-row-height'].forEach((property) => {
        clone.style.setProperty(property, sourceStyles.getPropertyValue(property));
    });
    Object.assign(clone.style, {
        background: '#ffffff',
        height: `${height}px`,
        maxHeight: 'none',
        overflow: 'visible',
        pointerEvents: 'none',
        position: 'relative',
        width: `${width}px`,
    });
    Object.assign(host.style, {
        height: `${height}px`,
        left: '0',
        overflow: 'hidden',
        pointerEvents: 'none',
        position: 'fixed',
        top: '0',
        width: `${width}px`,
        zIndex: '2147483647',
    });

    setStyles(clone.querySelector('.timeline-sidebar-pane'), {
        flex: `0 0 ${SIDEBAR_WIDTH}px`,
        position: 'static',
        width: `${SIDEBAR_WIDTH}px`,
    });
    setStyles(clone.querySelector('.timeline-sidebar-pane > aside'), {
        display: 'block',
        height: `${height}px`,
        width: `${SIDEBAR_WIDTH}px`,
    });
    setStyles(clone.querySelector('.timeline-canvas-pane'), {
        flex: `0 0 ${timelineWidth}px`,
        width: `${timelineWidth}px`,
    });
    setStyles(clone.querySelector('.timeline-canvas-frame'), {
        width: `${timelineWidth}px`,
    });
    setStyles(clone.querySelector('.timeline-header'), {
        position: 'relative',
        width: `${timelineWidth}px`,
    });
    setStyles(clone.querySelector('.timeline-header-track'), {
        transform: 'none',
        width: `${timelineWidth}px`,
    });
    setStyles(clone.querySelector('.timeline-horizontal-scroll'), {
        overflow: 'visible',
        width: `${timelineWidth}px`,
    });
    setStyles(clone.querySelector('.timeline-canvas'), {
        minWidth: `${timelineWidth}px`,
        width: `${timelineWidth}px`,
    });

    removeComposerRows(clone, rowHeight, height);

    clone.querySelectorAll('.timeline-tree-row-selected, .timeline-tree-row-hovered, .timeline-bar-hovered').forEach((node) => {
        node.classList.remove('timeline-tree-row-selected', 'timeline-tree-row-hovered', 'timeline-bar-hovered');
    });

    host.appendChild(clone);

    return { clone, host };
}

function removeComposerRows(clone, rowHeight, bodyAndHeaderHeight) {
    const sidebarRows = [...clone.querySelectorAll('.timeline-row-shell')];
    const composerIndices = sidebarRows
        .map((row, index) => (row.querySelector('.timeline-composer-row') ? index : null))
        .filter((index) => index !== null);

    if (!composerIndices.length) {
        return;
    }

    const removedBefore = (rowIndex) => composerIndices.filter((index) => index < rowIndex).length;
    const gridRows = [...clone.querySelectorAll('.timeline-grid-row')];

    sidebarRows.forEach((row, index) => {
        if (composerIndices.includes(index)) {
            row.remove();
        }
    });
    gridRows.forEach((row, index) => {
        if (composerIndices.includes(index)) {
            row.remove();
            return;
        }

        row.style.top = `${(index - removedBefore(index)) * rowHeight}px`;
    });

    clone.querySelectorAll('.timeline-bars > *').forEach((node) => {
        const top = Number.parseFloat(node.style.top);

        if (Number.isNaN(top)) {
            return;
        }

        const nodeHeight = Number.parseFloat(node.style.height) || rowHeight;
        const rowIndex = Math.round((top - ((rowHeight - nodeHeight) / 2)) / rowHeight);
        node.style.top = `${top - (removedBefore(rowIndex) * rowHeight)}px`;
    });

    const headerHeight = Number.parseFloat(window.getComputedStyle(clone).getPropertyValue('--timeline-header-height')) || 0;
    const bodyHeight = Math.max(0, bodyAndHeaderHeight - headerHeight);
    setStyles(clone.querySelector('.timeline-body'), { height: `${bodyHeight}px` });
    clone.querySelectorAll('.timeline-today-line, .timeline-weekend-band, .timeline-grid-col, .timeline-compressed-break-grid').forEach((node) => {
        node.style.height = `${bodyHeight}px`;
    });
}

function setStyles(element, styles) {
    if (element) {
        Object.assign(element.style, styles);
    }
}

function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function downloadDataUrl(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
}

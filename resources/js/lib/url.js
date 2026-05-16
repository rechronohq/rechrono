export function toAppPath(url) {
    if (typeof url !== 'string' || url === '') {
        return url;
    }

    try {
        const resolved = new URL(url, window.location.origin);

        return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    } catch {
        return url;
    }
}

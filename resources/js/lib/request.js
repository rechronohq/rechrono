function requestJsonError(message, status, payload = null) {
    const error = new Error(message);
    error.status = status;
    error.payload = payload;

    return error;
}

export async function request(url, options = {}) {
    const headers = new Headers(options.headers ?? {});
    const xsrfToken = document.cookie
        .split('; ')
        .find((value) => value.startsWith('XSRF-TOKEN='))
        ?.split('=')
        ?.slice(1)
        ?.join('=');
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

    headers.set('Accept', 'application/json');
    headers.set('X-Requested-With', 'XMLHttpRequest');

    if (xsrfToken) {
        headers.set('X-XSRF-TOKEN', decodeURIComponent(xsrfToken));
    } else if (csrfToken) {
        headers.set('X-CSRF-TOKEN', csrfToken);
    }

    if (isFormData) {
        headers.delete('Content-Type');
    } else if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        ...options,
        headers,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const expectsJson = contentType.includes('application/json');

    if (!expectsJson) {
        const bodyText = response.status === 204 ? '' : await response.text();

        if (response.ok) {
            throw requestJsonError('Expected a JSON response from the app API.', response.status, bodyText || null);
        }

        throw requestJsonError(bodyText || `Request failed: ${response.status}`, response.status, null);
    }

    const payload = await response.json();

    if (!response.ok) {
        throw requestJsonError(
            typeof payload === 'object' && payload !== null && typeof payload.message === 'string'
                ? payload.message
                : `Request failed: ${response.status}`,
            response.status,
            payload,
        );
    }

    return payload;
}

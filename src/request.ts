export function serializeBody(data: unknown, headers: Headers): BodyInit | undefined {
    if (data === undefined || data === null) return undefined;
    if (typeof data === 'string') return data;
    if (data instanceof Blob || data instanceof FormData || data instanceof URLSearchParams ||
        data instanceof ArrayBuffer ||
        (typeof ReadableStream !== 'undefined' && data instanceof ReadableStream)) {
        return data;
    }
    if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
    }
    if (typeof data !== 'object') {
        throw new TypeError('Request data must be an object or a supported Fetch body');
    }

    const body = JSON.stringify(data);
    if (body === undefined) {
        throw new TypeError('Request data could not be serialized as JSON');
    }
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    return body;
}

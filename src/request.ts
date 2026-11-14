import type { ClientDefaults, QueryParams, RequestConfig, ResolvedClientDefaults } from './types';

const requestKeys = new Set(['url', 'method', 'headers', 'data', 'baseURL', 'params', 'signal', 'timeout', 'withCredentials']);
const defaultKeys = new Set(['method', 'headers', 'baseURL', 'params', 'signal', 'timeout', 'withCredentials']);

function validateKeys(config: object, allowed: Set<string>, label: string): void {
    for (const key of Object.keys(config)) {
        if (!allowed.has(key)) throw new TypeError(`Unsupported ${label}: ${key}`);
    }
}

function mergeHeaders(defaults?: HeadersInit, overrides?: HeadersInit): Headers {
    const headers = new Headers(defaults);
    new Headers(overrides).forEach((value, key) => headers.set(key, value));
    return headers;
}

function cloneParams(params?: QueryParams): QueryParams | undefined {
    if (params === undefined) return undefined;
    return Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]),
    );
}

export function mergeDefaults(base: ClientDefaults, overrides: ClientDefaults): ResolvedClientDefaults {
    validateKeys(overrides, defaultKeys, 'client default');
    return {
        method: overrides.method ?? base.method,
        headers: mergeHeaders(base.headers, overrides.headers),
        baseURL: overrides.baseURL ?? base.baseURL,
        params: cloneParams(overrides.params ?? base.params),
        signal: overrides.signal ?? base.signal,
        timeout: overrides.timeout !== undefined ? overrides.timeout : base.timeout,
        withCredentials: overrides.withCredentials !== undefined ? overrides.withCredentials : base.withCredentials,
    };
}

export function mergeRequest(defaults: ClientDefaults, request: RequestConfig): RequestConfig {
    validateKeys(request, requestKeys, 'request option');
    return {
        url: request.url,
        method: request.method ?? defaults.method,
        headers: mergeHeaders(defaults.headers, request.headers),
        data: request.data,
        baseURL: request.baseURL ?? defaults.baseURL,
        params: request.params ?? defaults.params,
        signal: request.signal ?? defaults.signal,
        timeout: request.timeout !== undefined ? request.timeout : defaults.timeout,
        withCredentials: request.withCredentials !== undefined ? request.withCredentials : defaults.withCredentials,
    };
}

export function buildUrl(url: string, baseURL?: string, params?: QueryParams): string {
    const absolute = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url);
    const combined = baseURL && !absolute
        ? `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
        : url;
    if (!params || Object.keys(params).length === 0) return combined;

    const hashIndex = combined.indexOf('#');
    const hash = hashIndex < 0 ? '' : combined.slice(hashIndex);
    const withoutHash = hashIndex < 0 ? combined : combined.slice(0, hashIndex);
    const queryIndex = withoutHash.indexOf('?');
    const path = queryIndex < 0 ? withoutHash : withoutHash.slice(0, queryIndex);
    const query = new URLSearchParams(queryIndex < 0 ? '' : withoutHash.slice(queryIndex + 1));
    for (const [key, value] of Object.entries(params)) {
        for (const item of Array.isArray(value) ? value : [value]) {
            if (item === null || item === undefined) continue;
            if (typeof item !== 'string' && typeof item !== 'number' && typeof item !== 'boolean') {
                throw new TypeError(`Unsupported query value for ${key}`);
            }
            query.append(key, String(item));
        }
    }
    const search = query.toString();
    return `${path}${search ? `?${search}` : queryIndex >= 0 ? '?' : ''}${hash}`;
}

export function createAbortControl(signal?: AbortSignal, timeout = 0) {
    if (typeof timeout !== 'number' || !Number.isFinite(timeout) || timeout < 0) {
        throw new TypeError('Timeout must be a non-negative finite number');
    }
    if (!signal && timeout === 0) return { signal: undefined, kind: () => undefined, cleanup: () => {} };

    const controller = new AbortController();
    let kind: 'timeout' | 'canceled' | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => {
        if (!controller.signal.aborted) {
            kind = 'canceled';
            controller.abort(signal?.reason);
        }
    };
    if (signal?.aborted) onAbort();
    else signal?.addEventListener('abort', onAbort, { once: true });

    let remaining = timeout;
    const schedule = () => {
        const delay = Math.min(remaining, 2147483647);
        timer = setTimeout(() => {
            remaining -= delay;
            if (remaining > 0) schedule();
            else if (!controller.signal.aborted) {
                kind = 'timeout';
                controller.abort();
            }
        }, delay);
    };
    if (timeout > 0 && !controller.signal.aborted) schedule();

    return {
        signal: controller.signal,
        kind: () => kind,
        cleanup: () => {
            if (timer !== undefined) clearTimeout(timer);
            signal?.removeEventListener('abort', onAbort);
        },
    };
}

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

import { AxiosLike } from './axios-like';
import { FetchPlusError } from './errors';
import { buildUrl, createAbortControl, mergeDefaults, mergeRequest, serializeBody } from './request';
import { readResponse } from './response';
import type { ClientDefaults, FetchPlusResponse, RequestConfig, RequestOptions, ResolvedClientDefaults } from './types';

export class FetchPlusClient extends AxiosLike {
    readonly defaults: ResolvedClientDefaults;

    constructor(defaults: ClientDefaults = {}) {
        super();
        this.defaults = mergeDefaults({}, defaults);
    }

    async request<T = unknown>(input: string | RequestConfig, options: RequestOptions = {}): Promise<FetchPlusResponse<T>> {
        const request = typeof input === 'string' ? { ...options, url: input } : input;
        const config = mergeRequest(this.defaults, request);
        const headers = new Headers(config.headers);
        const body = serializeBody(config.data, headers);
        const url = buildUrl(config.url, config.baseURL, config.params);
        const method = (config.method ?? 'GET').toUpperCase();
        if (config.withCredentials !== undefined && typeof config.withCredentials !== 'boolean') {
            throw new TypeError('withCredentials must be a boolean');
        }
        const control = createAbortControl(config.signal, config.timeout);
        const init: RequestInit & { duplex?: 'half' } = {
            method,
            headers,
            body,
            signal: control.signal,
            credentials: config.withCredentials ? 'include' : 'same-origin',
        };
        if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
            init.duplex = 'half';
        }
        try {
            const initialKind = control.kind();
            if (initialKind) throw new FetchPlusError(initialKind, { cause: config.signal?.reason });
            const response = await fetch(url, init);
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
            return await readResponse<T>(response);
        } catch (error) {
            const kind = control.kind();
            if (kind && !(error instanceof FetchPlusError)) throw new FetchPlusError(kind, { cause: error });
            throw error;
        } finally {
            control.cleanup();
        }
    }
}

import { AxiosLike } from './axios-like';
import { FetchPlusError } from './errors';
import { InterceptorManager } from './interceptors';
import { buildUrl, createAbortControl, mergeDefaults, mergeRequest, serializeBody } from './request';
import { readResponse } from './response';
import type { ClientDefaults, FetchPlusResponse, RequestConfig, RequestOptions, ResolvedClientDefaults } from './types';

export class FetchPlusClient extends AxiosLike {
    readonly defaults: ResolvedClientDefaults;
    readonly interceptors = {
        request: new InterceptorManager<RequestConfig>(),
        response: new InterceptorManager<FetchPlusResponse>(),
    };

    constructor(defaults: ClientDefaults = {}) {
        super();
        this.defaults = mergeDefaults({}, defaults);
    }

    request<T = unknown>(input: string | RequestConfig, options: RequestOptions = {}): Promise<FetchPlusResponse<T>> {
        const requestHandlers = this.interceptors.request.snapshot().reverse();
        const responseHandlers = this.interceptors.response.snapshot();
        const execute = (initial: Promise<RequestConfig>): Promise<FetchPlusResponse> => {
            let config = initial;
            for (const handler of requestHandlers) {
                config = config.then(handler.fulfilled, handler.rejected);
            }
            return config.then((value) => this.dispatch<T>(value));
        };
        let result: Promise<FetchPlusResponse>;
        try {
            const request = typeof input === 'string' ? { ...options, url: input } : input;
            const config = mergeRequest(this.defaults, request);
            result = requestHandlers.length ? execute(Promise.resolve(config)) : this.dispatch<T>(config);
        } catch (error) {
            result = execute(Promise.reject(error));
        }
        for (const handler of responseHandlers) {
            result = result.then(handler.fulfilled, handler.rejected);
        }
        return result as Promise<FetchPlusResponse<T>>;
    }

    private async dispatch<T>(config: RequestConfig): Promise<FetchPlusResponse<T>> {
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
            const request = new Request(url, init);
            try {
                const response = await fetch(request);
                return await readResponse<T>(response);
            } catch (error) {
                const kind = control.kind();
                if (kind && !(error instanceof FetchPlusError)) throw new FetchPlusError(kind, { cause: error });
                if (error instanceof FetchPlusError) throw error;
                throw new FetchPlusError('network', { cause: error });
            }
        } finally {
            control.cleanup();
        }
    }
}

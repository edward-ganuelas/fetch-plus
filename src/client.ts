import { AxiosLike } from './axios-like';
import { serializeBody } from './request';
import { readResponse } from './response';
import type { FetchPlusResponse, RequestConfig, RequestOptions } from './types';

export class FetchPlusClient extends AxiosLike {
    async request<T = unknown>(input: string | RequestConfig, options: RequestOptions = {}): Promise<FetchPlusResponse<T>> {
        const config = typeof input === 'string' ? { ...options, url: input } : input;
        for (const key of Object.keys(config)) {
            if (key !== 'url' && key !== 'method' && key !== 'headers' && key !== 'data') {
                throw new TypeError(`Unsupported request option: ${key}`);
            }
        }
        const headers = new Headers(config.headers);
        const body = serializeBody(config.data, headers);
        const init: RequestInit & { duplex?: 'half' } = {
            method: (config.method ?? 'GET').toUpperCase(),
            headers,
            body,
        };
        if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
            init.duplex = 'half';
        }
        const response = await fetch(config.url, init);
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        return readResponse<T>(response);
    }
}

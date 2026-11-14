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
        const response = await fetch(config.url, {
            method: config.method ?? 'GET',
            headers,
            body: serializeBody(config.data, headers),
        });
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        return readResponse<T>(response);
    }
}

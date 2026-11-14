import { FetchPlusClient } from './client';
import type { FetchPlusResponse, RequestConfig, RequestOptions } from './types';

export type { FetchPlusResponse, HttpMethod, RequestConfig, RequestOptions } from './types';

const client = new FetchPlusClient();

function request<T = unknown>(url: string, options?: RequestOptions): Promise<FetchPlusResponse<T>>;
function request<T = unknown>(config: RequestConfig): Promise<FetchPlusResponse<T>>;
function request<T = unknown>(input: string | RequestConfig, options?: RequestOptions): Promise<FetchPlusResponse<T>> {
    return client.request<T>(input, options);
}

export default Object.assign(request, {
    get: client.get.bind(client),
    delete: client.delete.bind(client),
    head: client.head.bind(client),
    options: client.options.bind(client),
    post: client.post.bind(client),
    put: client.put.bind(client),
    patch: client.patch.bind(client),
});

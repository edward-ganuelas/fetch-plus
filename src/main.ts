import { FetchPlusClient } from './client';
import { mergeDefaults } from './request';
import type { ClientDefaults, FetchPlusResponse, HttpMethod, QueryParams, QueryScalar, RequestConfig, RequestOptions, ResolvedClientDefaults } from './types';

export type { FetchPlusError } from './errors';
export type { ClientDefaults, FetchPlusResponse, HttpMethod, QueryParams, QueryScalar, RequestConfig, RequestOptions, ResolvedClientDefaults };

interface FetchPlus {
    <T = unknown>(url: string, options?: RequestOptions): Promise<FetchPlusResponse<T>>;
    <T = unknown>(config: RequestConfig): Promise<FetchPlusResponse<T>>;
    readonly defaults: ResolvedClientDefaults;
    create(defaults?: ClientDefaults): FetchPlus;
    get: FetchPlusClient['get'];
    delete: FetchPlusClient['delete'];
    head: FetchPlusClient['head'];
    options: FetchPlusClient['options'];
    post: FetchPlusClient['post'];
    put: FetchPlusClient['put'];
    patch: FetchPlusClient['patch'];
}

function createClient(defaults: ClientDefaults = {}): FetchPlus {
    const client = new FetchPlusClient(defaults);

    function request<T = unknown>(url: string, options?: RequestOptions): Promise<FetchPlusResponse<T>>;
    function request<T = unknown>(config: RequestConfig): Promise<FetchPlusResponse<T>>;
    function request<T = unknown>(input: string | RequestConfig, options?: RequestOptions): Promise<FetchPlusResponse<T>> {
        return client.request<T>(input, options);
    }

    return Object.assign(request, {
        defaults: client.defaults,
        create: (options: ClientDefaults = {}) => createClient(mergeDefaults(client.defaults, options)),
        get: client.get.bind(client),
        delete: client.delete.bind(client),
        head: client.head.bind(client),
        options: client.options.bind(client),
        post: client.post.bind(client),
        put: client.put.bind(client),
        patch: client.patch.bind(client),
    });
}

export default createClient();

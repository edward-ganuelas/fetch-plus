export type HttpMethod =
    | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
    | 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

export type QueryScalar = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryScalar | readonly QueryScalar[]>;

export interface RequestOptions {
    method?: HttpMethod;
    headers?: HeadersInit;
    data?: unknown;
    baseURL?: string;
    params?: QueryParams;
    signal?: AbortSignal;
    timeout?: number;
    withCredentials?: boolean;
}

export interface RequestConfig extends RequestOptions {
    url: string;
}

export interface FetchPlusResponse<T = unknown> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
}

export type ClientDefaults = Omit<RequestOptions, 'data'>;
export type ResolvedClientDefaults = Omit<ClientDefaults, 'headers'> & { headers: Headers };
export type InterceptorFulfilled<T> = (value: T) => T | Promise<T>;
export type InterceptorRejected<T> = (error: unknown) => T | Promise<T>;
export type RequestErrorKind = 'http' | 'network' | 'timeout' | 'canceled';

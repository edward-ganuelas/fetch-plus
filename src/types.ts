export type HttpMethod =
    | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
    | 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

export interface RequestOptions {
    method?: HttpMethod;
    headers?: HeadersInit;
    data?: unknown;
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
export type InterceptorFulfilled<T> = (value: T) => T | Promise<T>;
export type InterceptorRejected<T> = (error: unknown) => T | Promise<T>;
export type RequestErrorKind = 'http' | 'network' | 'timeout' | 'canceled';

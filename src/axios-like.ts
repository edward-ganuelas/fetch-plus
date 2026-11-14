import type { FetchPlusResponse, RequestConfig, RequestOptions } from './types';

export abstract class AxiosLike {
    abstract request<T = unknown>(input: string | RequestConfig, options?: RequestOptions): Promise<FetchPlusResponse<T>>;

    get<T = unknown>(url: string, options?: RequestOptions): Promise<FetchPlusResponse<T>> {
        return this.request<T>(url, { ...options, method: 'GET' });
    }

    delete<T = unknown>(url: string, options?: RequestOptions): Promise<FetchPlusResponse<T>> {
        return this.request<T>(url, { ...options, method: 'DELETE' });
    }

    head<T = unknown>(url: string, options?: RequestOptions): Promise<FetchPlusResponse<T>> {
        return this.request<T>(url, { ...options, method: 'HEAD' });
    }

    options<T = unknown>(url: string, options?: RequestOptions): Promise<FetchPlusResponse<T>> {
        return this.request<T>(url, { ...options, method: 'OPTIONS' });
    }

    post<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<FetchPlusResponse<T>> {
        return this.request<T>(url, { ...options, method: 'POST', data });
    }

    put<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<FetchPlusResponse<T>> {
        return this.request<T>(url, { ...options, method: 'PUT', data });
    }

    patch<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<FetchPlusResponse<T>> {
        return this.request<T>(url, { ...options, method: 'PATCH', data });
    }
}

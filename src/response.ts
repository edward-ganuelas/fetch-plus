import type { FetchPlusResponse } from './types';

export async function readResponse<T>(response: Response): Promise<FetchPlusResponse<T>> {
    const text = await response.text();
    const mediaType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
    let data: unknown = text;

    if (text && mediaType && (mediaType.endsWith('/json') || mediaType.endsWith('+json'))) {
        try {
            data = JSON.parse(text);
        } catch (error) {
            if (!(error instanceof SyntaxError)) throw error;
        }
    }

    return {
        data: data as T,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    };
}

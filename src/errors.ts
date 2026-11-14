import type { FetchPlusResponse, RequestErrorKind } from './types';

export class FetchPlusError extends Error {
    readonly kind: RequestErrorKind;
    declare readonly response?: FetchPlusResponse;

    constructor(kind: RequestErrorKind, options?: ErrorOptions & { response?: FetchPlusResponse }) {
        const messages = {
            http: `Request failed with status ${options?.response?.status}`,
            network: options?.cause instanceof Error ? `Network request failed: ${options.cause.message}` : 'Network request failed',
            timeout: 'Request timed out',
            canceled: 'Request canceled',
        };
        if (kind === 'http' && !options?.response) throw new TypeError('HTTP errors require a response');
        if (kind !== 'http' && options?.response) throw new TypeError('Only HTTP errors can have a response');
        super(messages[kind], options);
        this.name = 'FetchPlusError';
        this.kind = kind;
        if (kind === 'http') this.response = options?.response;
    }
}

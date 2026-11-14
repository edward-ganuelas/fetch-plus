export class FetchPlusError extends Error {
    readonly kind: 'timeout' | 'canceled';

    constructor(kind: 'timeout' | 'canceled', options?: ErrorOptions) {
        super(kind === 'timeout' ? 'Request timed out' : 'Request canceled', options);
        this.name = 'FetchPlusError';
        this.kind = kind;
    }
}

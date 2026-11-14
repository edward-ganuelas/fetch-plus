import type { InterceptorFulfilled, InterceptorRejected } from './types';

interface Interceptor<T> {
    fulfilled: InterceptorFulfilled<T>;
    rejected?: InterceptorRejected<T>;
}

export class InterceptorManager<T> {
    private readonly handlers = new Map<symbol, Interceptor<T>>();

    use(fulfilled: InterceptorFulfilled<T>, rejected?: InterceptorRejected<T>): symbol {
        if (typeof fulfilled !== 'function' || (rejected !== undefined && typeof rejected !== 'function')) {
            throw new TypeError('Interceptor handlers must be functions');
        }
        const id = Symbol('interceptor');
        this.handlers.set(id, { fulfilled, rejected });
        return id;
    }

    eject(id: symbol): void {
        this.handlers.delete(id);
    }

    snapshot(): Interceptor<T>[] {
        return [...this.handlers.values()];
    }
}

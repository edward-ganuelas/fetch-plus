import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import axiosCompatible from './main';
import { AxiosLike } from './axios-like';
import { FetchPlusError } from './errors';

const server = setupServer(
    http.get('https://api.example.com/data', () =>
        HttpResponse.json({ message: 'GET success' })),
    http.post('https://api.example.com/data', async ({ request }) =>
        HttpResponse.json({ message: 'POST success', body: await request.json() }, { status: 201 })),
    http.get('https://api.example.com/error', () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
    http.all('https://api.example.com/echo', async ({ request }) => {
        if (request.method === 'HEAD') return new HttpResponse(null, { status: 200 });
        return HttpResponse.json({
            method: request.method,
            body: await request.text(),
            contentType: request.headers.get('content-type'),
        }, { headers: { 'X-Test-Received': request.headers.get('X-Test') ?? '' } });
    }),
    http.get('https://api.example.com/text', () =>
        new HttpResponse('plain text', { headers: { 'Content-Type': 'text/plain' } })),
    http.get('https://api.example.com/malformed', () =>
        new HttpResponse('{invalid', { headers: { 'Content-Type': 'application/json' } })),
    http.get('https://api.example.com/problem', () =>
        new HttpResponse('{"message":"ok"}', { headers: { 'Content-Type': 'application/problem+json; charset=utf-8' } })),
    http.get('https://api.example.com/empty', () =>
        new HttpResponse(null, { status: 204 })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
    vi.useRealTimers();
});
afterAll(() => server.close());

describe('US1', () => {
    it('lets subclasses reuse convenience methods with their own request implementation', async () => {
        class TestClient extends AxiosLike {
            request(url, options) {
                return Promise.resolve({ url, options });
            }
        }

        const client = new TestClient();
        await expect(client.get('/items', { method: 'POST', headers: { 'X-Test': 'yes' } }))
            .resolves.toEqual({ url: '/items', options: { method: 'GET', headers: { 'X-Test': 'yes' } } });
        await expect(client.post('/items', { value: 1 }, { method: 'GET' }))
            .resolves.toEqual({ url: '/items', options: { method: 'POST', data: { value: 1 } } });
    });

    it('sends GET when called with a URL', async () => {
        const response = await axiosCompatible('https://api.example.com/data');
        expect(response.status).toBe(200);
        expect(response.statusText).toBe('OK');
        expect(response.headers.get('content-type')).toContain('application/json');
        expect(response.data).toEqual({ message: 'GET success' });
    });

    it('uses the method and data from a config object', async () => {
        const response = await axiosCompatible({
            url: 'https://api.example.com/data',
            method: 'post',
            data: { foo: 'bar' },
        });
        expect(response.status).toBe(201);
        expect(response.data).toEqual({ message: 'POST success', body: { foo: 'bar' } });
    });

    it('normalizes lowercase PATCH from a config object', async () => {
        const response = await axiosCompatible({
            url: 'https://api.example.com/echo',
            method: 'patch',
            data: { foo: 'bar' },
        });
        expect(response.data.method).toBe('PATCH');
        expect(response.data.body).toBe('{"foo":"bar"}');
    });

    it('defaults a config-object request to GET', async () => {
        const response = await axiosCompatible({ url: 'https://api.example.com/data' });
        expect(response.data).toEqual({ message: 'GET success' });
    });

    it('accepts a URL with request options', async () => {
        const response = await axiosCompatible('https://api.example.com/data', {
            method: 'post',
            data: { foo: 'bar' },
        });
        expect(response.data).toEqual({ message: 'POST success', body: { foo: 'bar' } });
    });

    it.each(['get', 'delete', 'options'])('sends %s with URL and config', async (method) => {
        const response = await axiosCompatible[method]('https://api.example.com/echo', {
            headers: { 'X-Test': 'yes' },
        });
        expect(response.data.method).toBe(method.toUpperCase());
        expect(response.data.body).toBe('');
        expect(response.headers.get('x-test-received')).toBe('yes');
    });

    it('sends HEAD and returns an empty body', async () => {
        const response = await axiosCompatible.head('https://api.example.com/echo');
        expect(response.status).toBe(200);
        expect(response.data).toBe('');
    });

    it.each(['post', 'put', 'patch'])('serializes JSON with %s', async (method) => {
        const response = await axiosCompatible[method]('https://api.example.com/echo', { foo: 'bar' });
        expect(response.data).toEqual({
            method: method.toUpperCase(),
            body: '{"foo":"bar"}',
            contentType: 'application/json',
        });
    });

    it('preserves a caller-provided content type while serializing JSON', async () => {
        const response = await axiosCompatible.post('https://api.example.com/echo', { foo: 'bar' }, {
            headers: { 'content-type': 'application/custom' },
        });
        expect(response.data.body).toBe('{"foo":"bar"}');
        expect(response.data.contentType).toBe('application/custom');
    });

    it('preserves non-JSON request body and platform content type', async () => {
        const body = new URLSearchParams({ name: 'value' });
        const response = await axiosCompatible.post('https://api.example.com/echo', body);
        expect(response.data.body).toBe('name=value');
        expect(response.data.contentType).toContain('application/x-www-form-urlencoded');
    });

    it('sends a readable stream body without adding a content type', async () => {
        const body = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('streamed body'));
                controller.close();
            },
        });
        const response = await axiosCompatible.post('https://api.example.com/echo', body);
        expect(response.data.body).toBe('streamed body');
        expect(response.data.contentType).toBeNull();
    });

    it('parses JSON media types with a structured suffix', async () => {
        const response = await axiosCompatible.get('https://api.example.com/problem');
        expect(response.data).toEqual({ message: 'ok' });
    });

    it('rejects unsupported options instead of ignoring them', async () => {
        await expect(axiosCompatible.get('https://api.example.com/data', { unsupported: true }))
            .rejects.toThrow('Unsupported request option: unsupported');
    });

    it.each([
        ['text', 'plain text'],
        ['malformed', '{invalid'],
        ['empty', ''],
    ])('returns %s response bodies as text', async (path, expected) => {
        const response = await axiosCompatible.get(`https://api.example.com/${path}`);
        expect(response.data).toBe(expected);
    });
});

describe('US2', () => {
    function inspectRequests() {
        const inspect = ({ request }) => HttpResponse.json({
            url: request.url,
            headers: Object.fromEntries(request.headers),
            credentials: request.credentials,
        });
        server.use(
            http.all('https://api.example.com/*', inspect),
            http.all('https://other.example.com/*', inspect),
        );
    }

    function mockPendingFetch() {
        return vi.spyOn(globalThis, 'fetch').mockImplementation((request) =>
            new Promise((_resolve, reject) => {
                if (request.signal.aborted) {
                    reject(new DOMException('Aborted', 'AbortError'));
                } else {
                    request.signal.addEventListener('abort', () =>
                        reject(new DOMException('Aborted', 'AbortError')), { once: true });
                }
            }));
    }

    it('isolates client defaults and applies request overrides without mutating them', async () => {
        inspectRequests();
        const headers = { 'X-Token': 'first', 'X-Shared': 'default' };
        const first = axiosCompatible.create({ baseURL: 'https://api.example.com/v1/', headers });
        const second = axiosCompatible.create({ baseURL: 'https://other.example.com/v2', headers: { 'X-Token': 'second' } });
        headers['X-Token'] = 'changed outside';

        const override = await first('/items', { headers: { 'x-shared': 'override' } });
        const original = await first({ url: '/items' });
        const other = await second.get('items');
        expect(override.data.url).toBe('https://api.example.com/v1/items');
        expect(override.data.headers['x-shared']).toBe('override');
        expect(override.data.headers['x-token']).toBe('first');
        expect(original.data.headers['x-shared']).toBe('default');
        expect(original.data.headers['x-token']).toBe('first');
        expect(other.data.url).toBe('https://other.example.com/v2/items');
        expect(other.data.headers['x-token']).toBe('second');
    });

    it('creates isolated child clients with inherited and overridden defaults', async () => {
        inspectRequests();
        const parent = axiosCompatible.create({ baseURL: 'https://api.example.com/v1', headers: { 'X-Parent': 'yes' } });
        const child = parent.create({ headers: { 'X-Child': 'yes' } });
        child.defaults.headers.set('X-Parent', 'changed');
        const childResponse = await child.get('/items');
        const parentResponse = await parent.get('/items');
        expect(childResponse.data.headers['x-parent']).toBe('changed');
        expect(childResponse.data.headers['x-child']).toBe('yes');
        expect(parentResponse.data.headers['x-parent']).toBe('yes');
        expect(parentResponse.data.headers['x-child']).toBeUndefined();
    });

    it('isolates query defaults and applies request overrides without mutating them', async () => {
        inspectRequests();
        const params = { tag: ['one', 'two'] };
        const parent = axiosCompatible.create({ baseURL: 'https://api.example.com', params });
        const child = parent.create();
        params.tag.push('outside');
        child.defaults.params.tag.push('child');
        expect(new URL((await parent.get('/items')).data.url).searchParams.getAll('tag')).toEqual(['one', 'two']);
        expect(new URL((await child.get('/items')).data.url).searchParams.getAll('tag')).toEqual(['one', 'two', 'child']);
        expect(new URL((await parent.get('/items', { params: { tag: 'override' } })).data.url).searchParams.getAll('tag'))
            .toEqual(['override']);
    });

    it('applies configured methods and request overrides without reusing request data', async () => {
        const client = axiosCompatible.create({ baseURL: 'https://api.example.com', method: 'post' });
        const first = await client({ url: '/echo', data: { value: 1 } });
        const second = await client({ url: '/echo', method: 'put' });
        expect(first.data.method).toBe('POST');
        expect(first.data.body).toBe('{"value":1}');
        expect(second.data.method).toBe('PUT');
        expect(second.data.body).toBe('');
        expect(client.defaults.method).toBe('post');
    });

    it('rejects request data as a client default rather than reusing it', () => {
        expect(() => axiosCompatible.create({ data: { reused: true } }))
            .toThrow('Unsupported client default: data');
    });

    it('joins base paths, bypasses the base for absolute URLs and serializes query values', async () => {
        inspectRequests();
        const client = axiosCompatible.create({ baseURL: 'https://api.example.com/v1/' });
        const response = await client.get('/items?existing=one#section', {
            params: { name: 'a b', items: ['one', 'two', null], zero: 0, flag: false, absent: null, missing: undefined },
        });
        const url = new URL(response.data.url);
        expect(url.pathname).toBe('/v1/items');
        expect(url.searchParams.get('existing')).toBe('one');
        expect(url.searchParams.get('name')).toBe('a b');
        expect(url.searchParams.getAll('items')).toEqual(['one', 'two']);
        expect(url.searchParams.get('zero')).toBe('0');
        expect(url.searchParams.get('flag')).toBe('false');
        expect(url.searchParams.has('absent')).toBe(false);
        expect(url.searchParams.has('missing')).toBe(false);
        const absolute = await client.get('https://other.example.com/absolute');
        expect(absolute.data.url).toBe('https://other.example.com/absolute');
    });

    it('preserves fragments while adding query parameters', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));
        await axiosCompatible.get('https://api.example.com/items?existing=one#section', { params: { flag: false } });
        expect(fetchSpy.mock.calls[0][0].url).toBe('https://api.example.com/items?existing=one&flag=false#section');
    });

    it('preserves the original query bytes when appending or omitting parameters', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('ok'));
        const url = 'https://api.example.com/items?token=%E9&name=a%20b#section';
        await axiosCompatible.get(url, { params: { ignored: null } });
        await axiosCompatible.get(url, { params: { added: 'a b' } });
        await axiosCompatible.get('https://api.example.com/items?#section', { params: { added: 1 } });
        expect(fetchSpy.mock.calls.map(([request]) => request.url)).toEqual([
            url,
            'https://api.example.com/items?token=%E9&name=a%20b&added=a+b#section',
            'https://api.example.com/items?added=1#section',
        ]);
    });

    it('uses the Fetch same-origin credential default unless explicitly opted in', async () => {
        inspectRequests();
        const client = axiosCompatible.create({ baseURL: 'https://api.example.com', withCredentials: true });
        expect((await axiosCompatible.get('https://api.example.com/data')).data.credentials).toBe('same-origin');
        expect((await client.get('/data')).data.credentials).toBe('include');
        expect((await client.get('/data', { withCredentials: false })).data.credentials).toBe('same-origin');
    });

    it('rejects an already-aborted signal without sending a request', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const controller = new AbortController();
        controller.abort();
        await expect(axiosCompatible.get('https://api.example.com/data', { signal: controller.signal }))
            .rejects.toMatchObject({ kind: 'canceled' });
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('distinguishes caller cancellation and removes its abort listener', async () => {
        mockPendingFetch();
        const controller = new AbortController();
        const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
        const pending = axiosCompatible.get('https://api.example.com/data', { signal: controller.signal, timeout: 1000 });
        const assertion = expect(pending).rejects.toMatchObject({ kind: 'canceled' });
        controller.abort();
        await assertion;
        expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('classifies cancellation as canceled even when aborted with a prior FetchPlusError', async () => {
        const previousHttpError = new FetchPlusError('http', {
            response: { status: 500, statusText: 'Internal Server Error', data: {}, headers: new Headers() },
        });
        vi.spyOn(globalThis, 'fetch').mockImplementation((request) =>
            new Promise((_resolve, reject) => {
                request.signal.addEventListener('abort', () =>
                    reject(request.signal.reason), { once: true });
            }));
        const controller = new AbortController();
        const pending = axiosCompatible.get('https://api.example.com/data', { signal: controller.signal });
        const assertion = expect(pending).rejects.toMatchObject({
            kind: 'canceled',
            cause: previousHttpError,
        });
        controller.abort(previousHttpError);
        await assertion;
    });

    it('cleans up timers and listeners on success and transport failure', async () => {
        vi.useFakeTimers();
        const controller = new AbortController();
        const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
        const fetchSpy = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(new Response('ok'))
            .mockRejectedValueOnce(new TypeError('network failure'));
        await axiosCompatible.get('https://api.example.com/data', { signal: controller.signal, timeout: 100 });
        expect(vi.getTimerCount()).toBe(0);
        await expect(axiosCompatible.get('https://api.example.com/data', { signal: controller.signal, timeout: 100 }))
            .rejects.toThrow('network failure');
        expect(vi.getTimerCount()).toBe(0);
        expect(removeListener).toHaveBeenCalledTimes(2);
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('keeps the timeout active while reading the response body', async () => {
        vi.useFakeTimers();
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (request) => new Response(new ReadableStream({
            start(controller) {
                request.signal.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')));
            },
        })));
        const assertion = expect(axiosCompatible.get('https://api.example.com/data', { timeout: 10 }))
            .rejects.toMatchObject({ name: 'FetchPlusError', kind: 'timeout' });
        await vi.advanceTimersByTimeAsync(10);
        await assertion;
        expect(vi.getTimerCount()).toBe(0);
    });

    it('applies timeout defaults, request overrides, and zero to disable timeout', async () => {
        vi.useFakeTimers();
        mockPendingFetch();
        const client = axiosCompatible.create({ timeout: 10 });
        const defaultAssertion = expect(client.get('https://api.example.com/data'))
            .rejects.toMatchObject({ kind: 'timeout' });
        await vi.advanceTimersByTimeAsync(10);
        await defaultAssertion;

        const overrideAssertion = expect(client.get('https://api.example.com/data', { timeout: 20 }))
            .rejects.toMatchObject({ kind: 'timeout' });
        await vi.advanceTimersByTimeAsync(19);
        expect(vi.getTimerCount()).toBe(1);
        await vi.advanceTimersByTimeAsync(1);
        await overrideAssertion;

        const controller = new AbortController();
        const disabled = client.get('https://api.example.com/data', { timeout: 0, signal: controller.signal });
        const disabledAssertion = expect(disabled).rejects.toMatchObject({ kind: 'canceled' });
        await vi.advanceTimersByTimeAsync(100);
        expect(vi.getTimerCount()).toBe(0);
        controller.abort();
        await disabledAssertion;
    });

    it('rejects invalid timeouts and handles large finite timeouts without overflow', async () => {
        for (const timeout of [-1, Infinity, NaN, '10']) {
            await expect(axiosCompatible.get('https://api.example.com/data', { timeout })).rejects.toThrow();
        }
        vi.useFakeTimers();
        mockPendingFetch();
        const controller = new AbortController();
        const pending = axiosCompatible.get('https://api.example.com/data', {
            timeout: 2147483648,
            signal: controller.signal,
        });
        const assertion = expect(pending).rejects.toMatchObject({ kind: 'canceled' });
        await vi.advanceTimersByTimeAsync(1);
        controller.abort();
        await assertion;

        const timeoutAssertion = expect(axiosCompatible.get('https://api.example.com/data', { timeout: 2147483648 }))
            .rejects.toMatchObject({ kind: 'timeout' });
        await vi.advanceTimersByTimeAsync(2147483647);
        expect(vi.getTimerCount()).toBe(1);
        await vi.advanceTimersByTimeAsync(1);
        await timeoutAssertion;
    });

    it('supports custom config', async () => {
        const response = await axiosCompatible.get('https://api.example.com/data', { headers: { 'X-Test': 'yes' } });
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ message: 'GET success' });
    });

    it('supports query params', async () => {
        const response = await axiosCompatible.get('https://api.example.com/data', { params: { foo: 'bar', baz: 1 } });
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ message: 'GET success' });
    });
});

describe('US3', () => {
    it('exposes an HTTP error response', async () => {
        await expect(axiosCompatible.get('https://api.example.com/error')).rejects.toMatchObject({
            kind: 'http',
            response: { status: 404, data: { error: 'Not found' }, headers: expect.any(Headers) },
        });
    });

    it('returns successful responses and preserves empty HTTP error bodies', async () => {
        server.use(
            http.get('https://api.example.com/empty-error', () =>
                new HttpResponse(null, { status: 503, headers: { 'X-Reason': 'unavailable' } })),
        );
        expect((await axiosCompatible.get('https://api.example.com/empty')).status).toBe(204);
        await expect(axiosCompatible.get('https://api.example.com/empty-error')).rejects.toMatchObject({
            kind: 'http',
            response: { status: 503, data: '', headers: expect.any(Headers) },
        });
        const error = await axiosCompatible.get('https://api.example.com/empty-error').catch((value) => value);
        expect(error.response.headers.get('x-reason')).toBe('unavailable');
    });

    it('applies the 2xx policy at the status boundaries', async () => {
        vi.spyOn(globalThis, 'fetch')
            .mockImplementationOnce(async () => new Response('ok', { status: 299 }))
            .mockImplementationOnce(async () => new Response('redirect', { status: 300 }));
        await expect(axiosCompatible.get('https://api.example.com/data')).resolves.toMatchObject({ status: 299 });
        await expect(axiosCompatible.get('https://api.example.com/data')).rejects.toMatchObject({
            kind: 'http', response: { status: 300, data: 'redirect' },
        });
    });

    it('classifies transport failures without fabricating a response', async () => {
        const cause = new TypeError('network failed');
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(cause);
        const error = await axiosCompatible.get('https://api.example.com/data').catch((value) => value);
        expect(error).toMatchObject({ kind: 'network', cause });
        expect(error).not.toHaveProperty('response');
    });

    it('classifies response-body transport failures without fabricating a response', async () => {
        const cause = new TypeError('body stream failed');
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new ReadableStream({
            start(controller) { controller.error(cause); },
        })));
        const error = await axiosCompatible.get('https://api.example.com/data').catch((value) => value);
        expect(error).toMatchObject({ kind: 'network', cause });
        expect(error).not.toHaveProperty('response');
    });

    it('does not classify invalid configuration or interceptor failures as network errors', async () => {
        const client = axiosCompatible.create();
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        await expect(client.get('https://api.example.com/data', { timeout: -1 }))
            .rejects.toThrow('Timeout must be a non-negative finite number');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('preserves native request-validation errors and cleans up cancellation resources', async () => {
        vi.useFakeTimers();
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network failure'));
        const controller = new AbortController();
        const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
        const options = { timeout: 100, signal: controller.signal };
        const requests = [
            { url: 'https://api.example.com/data', method: 'GET', data: { value: 1 } },
            { url: 'https://api.example.com/data', method: 'HEAD', data: 'body' },
            { url: 'http://[', method: 'GET' },
            { url: 'https://api.example.com/data', method: 'TRACE' },
        ];
        for (const request of requests) {
            const error = await axiosCompatible({ ...request, ...options }).catch((value) => value);
            expect(error).toBeInstanceOf(TypeError);
            expect(error).not.toHaveProperty('kind');
            expect(vi.getTimerCount()).toBe(0);
        }
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(removeListener).toHaveBeenCalledTimes(requests.length);
    });

    it('captures defaults when a request starts without request interceptors', async () => {
        const client = axiosCompatible.create({ headers: { 'X-Test': 'before' } });
        const pending = client.get('https://api.example.com/echo');
        client.defaults.headers.set('X-Test', 'after');
        expect((await pending).headers.get('x-test-received')).toBe('before');
    });

    it('captures query defaults before asynchronous request interceptors run', async () => {
        const client = axiosCompatible.create({ params: { tag: ['before'] } });
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));
        client.interceptors.request.use(async (config) => config);
        const pending = client.get('https://api.example.com/data');
        client.defaults.params.tag.push('after');
        await pending;
        expect(fetchSpy.mock.calls[0][0].url).toBe('https://api.example.com/data?tag=before');
    });

    it('runs request interceptors in reverse and response interceptors in registration order', async () => {
        const client = axiosCompatible.create();
        const order = [];
        client.interceptors.request.use((config) => {
            order.push('request 1');
            config.headers.set('X-Test', 'intercepted');
            return config;
        });
        client.interceptors.request.use(async (config) => {
            order.push('request 2');
            return config;
        });
        client.interceptors.response.use((response) => {
            order.push('response 1');
            response.data.first = true;
            return response;
        });
        client.interceptors.response.use((response) => {
            order.push('response 2');
            response.data.second = response.data.first;
            return response;
        });
        const response = await client.get('https://api.example.com/echo');
        expect(order).toEqual(['request 2', 'request 1', 'response 1', 'response 2']);
        expect(response.headers.get('x-test-received')).toBe('intercepted');
        expect(response.data.second).toBe(true);
    });

    it('ejects handlers and keeps client interceptor state isolated', async () => {
        const first = axiosCompatible.create();
        const second = first.create();
        const firstHandler = vi.fn((response) => response);
        const secondHandler = vi.fn((response) => response);
        const id = first.interceptors.response.use(firstHandler);
        const requestHandler = vi.fn((config) => config);
        const requestId = first.interceptors.request.use(requestHandler);
        second.interceptors.response.use(secondHandler);
        second.interceptors.response.eject(id);
        first.interceptors.response.eject(id);
        first.interceptors.request.eject(requestId);
        first.interceptors.response.eject(id);
        first.interceptors.response.eject(-1);
        await first.get('https://api.example.com/data');
        await second.get('https://api.example.com/data');
        expect(firstHandler).not.toHaveBeenCalled();
        expect(requestHandler).not.toHaveBeenCalled();
        expect(secondHandler).toHaveBeenCalledOnce();
    });

    it('rejects invalid interceptor handlers rather than silently ignoring them', () => {
        const client = axiosCompatible.create();
        expect(() => client.interceptors.request.use(undefined)).toThrow('Interceptor handlers must be functions');
        expect(() => client.interceptors.response.use((response) => response, null))
            .toThrow('Interceptor handlers must be functions');
    });

    it('propagates interceptor failures and permits later response rejection handlers to recover', async () => {
        const client = axiosCompatible.create();
        const failure = new Error('interceptor failure');
        client.interceptors.response.use(() => { throw failure; });
        await expect(client.get('https://api.example.com/data')).rejects.toBe(failure);
        client.interceptors.response.use((response) => response, (error) => ({
            data: error.message, status: 200, statusText: 'Recovered', headers: new Headers(),
        }));
        await expect(client.get('https://api.example.com/data')).resolves.toMatchObject({
            data: 'interceptor failure', statusText: 'Recovered',
        });
    });

    it('routes HTTP failures through response rejection handlers for explicit recovery', async () => {
        const client = axiosCompatible.create();
        client.interceptors.response.use((response) => response, (error) => ({
            data: error.response.data, status: error.response.status, statusText: 'Recovered', headers: error.response.headers,
        }));
        await expect(client.get('https://api.example.com/error')).resolves.toMatchObject({
            data: { error: 'Not found' }, status: 404, statusText: 'Recovered',
        });
    });

    it('allows request rejection handlers to recover and sends unhandled failures to response handlers', async () => {
        const client = axiosCompatible.create();
        const failure = new Error('request interceptor failure');
        client.interceptors.request.use((config) => config, () => ({ url: 'https://api.example.com/data' }));
        client.interceptors.request.use(() => { throw failure; });
        await expect(client.get('https://api.example.com/unused')).resolves.toMatchObject({
            data: { message: 'GET success' },
        });

        const failing = axiosCompatible.create();
        failing.interceptors.request.use(() => { throw failure; });
        const responseFailure = vi.fn((error) => { throw error; });
        failing.interceptors.response.use((response) => response, responseFailure);
        await expect(failing.get('https://api.example.com/data')).rejects.toBe(failure);
        expect(responseFailure).toHaveBeenCalledWith(failure);
    });

    it('supports response interceptors', async () => {
        let intercepted = false;
        const interceptorId = axiosCompatible.interceptors.response.use((response) => {
            intercepted = true;
            response.data.intercepted = true;
            return response;
        });
        try {
            const response = await axiosCompatible.get('https://api.example.com/data');
            expect(intercepted).toBe(true);
            expect(response.data).toEqual({ message: 'GET success', intercepted: true });
        } finally {
            axiosCompatible.interceptors.response.eject(interceptorId);
        }
    });
});
it('throws for non-string URLs', async () => {
    const client = axiosCompatible.create();
    await expect(client.get(123)).rejects.toThrow('Request URL must be a string');
});

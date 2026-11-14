import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import axiosCompatible from './main';
import { AxiosLike } from './axios-like';

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
afterEach(() => server.resetHandlers());
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

    it('parses JSON media types with a structured suffix', async () => {
        const response = await axiosCompatible.get('https://api.example.com/problem');
        expect(response.data).toEqual({ message: 'ok' });
    });

    it('rejects unsupported options instead of ignoring them', async () => {
        await expect(axiosCompatible.get('https://api.example.com/data', { params: { x: 1 } }))
            .rejects.toThrow('Unsupported request option: params');
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
            response: { status: 404, data: { error: 'Not found' } },
        });
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

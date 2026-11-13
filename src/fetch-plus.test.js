import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
// Replace this import with your actual function if needed
import axiosCompatible from './main';

const server = setupServer(
    rest.get('https://api.example.com/data', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ message: 'GET success' }));
    }),
    rest.post('https://api.example.com/data', (req, res, ctx) => {
        return res(ctx.status(201), ctx.json({ message: 'POST success', body: req.body }));
    }),
    rest.get('https://api.example.com/error', (req, res, ctx) => {
        return res(ctx.status(404), ctx.json({ error: 'Not found' }));
    })
);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('axios-compatible function', () => {
    it('should handle GET requests', async () => {
        const response = await axiosCompatible.get('https://api.example.com/data');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ message: 'GET success' });
    });

    it('should handle POST requests with data', async () => {
        const postData = { foo: 'bar' };
        const response = await axiosCompatible.post('https://api.example.com/data', postData);
        expect(response.status).toBe(201);
        expect(response.data).toEqual({ message: 'POST success', body: postData });
    });

    it('should handle error responses', async () => {
        try {
            await axiosCompatible.get('https://api.example.com/error');
        } catch (error) {
            expect(error.response.status).toBe(404);
            expect(error.response.data).toEqual({ error: 'Not found' });
        }
    });

    it('should support custom config', async () => {
        const response = await axiosCompatible.get('https://api.example.com/data', { headers: { 'X-Test': 'yes' } });
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ message: 'GET success' });
    });

    it('should support response interceptors', async () => {
        // Save original interceptors if present
        const originalInterceptors = axiosCompatible.interceptors?.response?.handlers?.slice();
        let intercepted = false;
        // Add a response interceptor
        const interceptorId = axiosCompatible.interceptors.response.use((response) => {
            intercepted = true;
            response.data.intercepted = true;
            return response;
        });
        const response = await axiosCompatible.get('https://api.example.com/data');
        expect(intercepted).toBe(true);
        expect(response.data).toEqual({ message: 'GET success', intercepted: true });
        // Eject the interceptor after test
        axiosCompatible.interceptors.response.eject(interceptorId);
        // Restore original interceptors if needed
        if (originalInterceptors) {
            axiosCompatible.interceptors.response.handlers = originalInterceptors;
        }
    });

    it('should support being called as a function (axios callable)', async () => {
        const response = await axiosCompatible('https://api.example.com/data');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ message: 'GET success' });
    });

    it('should support being called with a config object', async () => {
        const response = await axiosCompatible({ url: 'https://api.example.com/data', method: 'get', headers: { 'X-Test': 'yes' } });
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ message: 'GET success' });
    });

    it('should support query params in GET requests', async () => {
        const response = await axiosCompatible.get('https://api.example.com/data', { params: { foo: 'bar', baz: 1 } });
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ message: 'GET success' });
    });
});

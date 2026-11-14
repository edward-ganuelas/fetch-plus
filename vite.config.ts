import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/main.ts',
            name: 'fetchPlus',
            formats: ['es', 'umd'],
            fileName: (format) => format === 'es' ? 'fetch-plus.js' : 'fetch-plus.umd.cjs',
        }
    }
});

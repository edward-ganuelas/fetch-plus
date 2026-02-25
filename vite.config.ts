import { defineConfig } from 'vite';

export default defineConfig({
    // ...add custom config options here if needed
    build: {
        lib: {
            entry: 'src/main.ts',
            name: 'fetchPlus',
        }
    }
});

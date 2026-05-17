import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['resources/js/**/*.test.js'],
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/react') || id.includes('node_modules/scheduler') || id.includes('@inertiajs/react')) {
                        return 'react-vendor';
                    }

                    if (id.includes('@radix-ui') || id.includes('lucide-react')) {
                        return 'ui-vendor';
                    }

                    if (id.includes('/resources/js/Pages/Timeline/')) {
                        return 'timeline';
                    }
                },
            },
        },
    },
    plugins: [
        react(),
        laravel({
            input: ['resources/js/app.jsx'],
            refresh: true,
        }),
    ],
});

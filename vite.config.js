import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Multi-page app: include admin.html as an additional entry
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },

  // Rewrite /admin to /admin.html so the route works in dev
  server: {
    open: false,
  },

  plugins: [
    {
      name: 'rewrite-admin-route',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Rewrite /admin (without .html) to /admin.html
          if (req.url === '/admin' || req.url === '/admin/') {
            req.url = '/admin.html';
          }
          next();
        });
      },
    },
  ],
});

import { fileURLToPath } from 'node:url';
const r = (f) => fileURLToPath(new URL(f, import.meta.url));
export default { build: { rollupOptions: { input: { main: r('index.html'), admin: r('admin.html') } } } };

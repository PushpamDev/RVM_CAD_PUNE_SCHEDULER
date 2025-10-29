# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Stack: Vite + React 18 + TypeScript + TailwindCSS + Radix/shadcn UI, TanStack Query, React Router. Vitest for testing. Express for a small Node server build.
- Structure: client (UI), server (Express), shared (TypeScript domain types). Vite path aliases: "@" -> ./client, "@shared" -> ./shared.
- Dev server: Vite on port 8080, exposed on 0.0.0.0. Optional proxy for /api to a hosted backend.
- Builds: Client output to dist/spa, server output to dist/server (entry dist/server/node-build.mjs).

Commands
Note on package manager: package.json declares pnpm in the packageManager field, but a package-lock.json is present. Prefer pnpm for consistency, or use npm equivalents. Examples below use pnpm first and npm alternatives.

- Start dev server (localhost)
  - pnpm: pnpm dev
  - npm: npm run dev
  Vite serves on http://localhost:8080

- Start dev server for LAN testing (uses Vite mode "lan")
  - pnpm: pnpm dev:lan
  - npm: npm run dev:lan
  This mode expects Vite envs for mode "lan" (see Environment).

- Build (client + server)
  - pnpm: pnpm build
  - npm: npm run build

- Build only client
  - pnpm: pnpm run build:client
  - npm: npm run build:client

- Build only server
  - pnpm: pnpm run build:server
  - npm: npm run build:server

- Start production server (after build)
  - pnpm: pnpm start
  - npm: npm start
  Serves the built SPA from dist/spa via Express (port = $PORT or 3000).

- Run tests (Vitest)
  - All tests, single run: pnpm test  |  npm test
  - Watch mode: pnpm exec vitest  |  npx vitest
  - Single file: pnpm exec vitest run client/lib/utils.spec.ts  |  npx vitest run client/lib/utils.spec.ts
  - Single test by name: pnpm exec vitest run -t "cn function"  |  npx vitest run -t "cn function"

- Formatting (Prettier)
  - pnpm: pnpm run format.fix
  - npm: npm run format.fix

- Type check (tsc, no emit)
  - pnpm: pnpm run typecheck
  - npm: npm run typecheck

Environment
- Client reads import.meta.env.VITE_API_BASE_URL via client/lib/api.ts.
  - If unset, client defaults to http://localhost:3001
  - If set without a protocol (e.g. 192.168.1.100:3001), client will assume https://
- A sample LAN file exists at client/.env.lan with VITE_API_BASE_URL=192.168.1.100:3001
  - Vite loads .env files from the project root by default for each mode. If VITE_API_BASE_URL is not being picked up in LAN mode, copy or move that file to ./.env.lan

High-level architecture
- Client (./client)
  - Entry/UI: client/App.tsx attaches to #root (see index.html). Tailwind styles in client/global.css. Theming and UI components live under client/components/ui (shadcn-based wrappers) and additional feature components under client/components.
  - Routing: React Router in App.tsx defines routes. ProtectedRoute wraps routes to enforce authentication and optional role-based access (e.g., requiredRole="admin" or ["admin","faculty"]).
  - Auth: client/hooks/AuthContext.tsx reads a JWT from localStorage key "token". It decodes/validates expiry on load and exposes { user, token, login, logout }. It also listens for a window "unauthorized" event to auto-logout on 401.
  - Data fetching: Direct fetch calls to `${API_BASE_URL}/api/...` with Authorization: Bearer <token> headers (see client/pages/* and API_BASE_URL from client/lib/api.ts). React Query (QueryClientProvider) is configured in App.tsx for cache and async state.
  - Utilities: client/lib/utils.ts supplies cn(...) (clsx + tailwind-merge). A Vitest suite exists at client/lib/utils.spec.ts.
  - Types: Feature-specific types under client/types and shared domain types pulled from @shared where applicable.

- Server (./server)
  - Express app factory in server/index.ts sets up CORS, JSON/urlencoded parsers. Example routes are included (commented) and a demo handler exists in server/routes/demo.ts (uses types from @shared/api).
  - Production entry (bundled via Vite library build): server/node-build.ts. It serves static assets from dist/spa and starts on process.env.PORT || 3000.
  - Dev entry (optional): server/dev-server.ts creates the Express app and listens on PORT. This is independent from Vite’s front-end dev server.

- Shared (./shared)
  - Domain model and API types in shared/api.ts (Faculty, Batch, Skill, WeeklySchedule, etc.), plus helper constants like DAYS_OF_WEEK and BATCH_STATUSES. Shared via Vite alias "@shared".

- Build and config
  - Vite client config (vite.config.ts):
    - server: host 0.0.0.0, port 8080
    - proxy: /api -> https://prod-ready-frontend-fbd-ee55.onrender.com (changeOrigin: true)
    - fs allowlist for ./client and ./shared and deny for server/** and sensitive files
    - aliases: "@" -> ./client, "@shared" -> ./shared
    - build outDir: dist/spa
  - Vite server build (vite.config.server.ts):
    - Library build targeting Node 22 SSR, output dist/server/node-build.mjs
    - Marks express and cors (and Node built-ins) as external
  - Tailwind config (tailwind.config.ts): content ./client/**/*.{ts,tsx}, with extended theme tokens and animations; postcss.config.js enables tailwindcss and autoprefixer.

Practical notes for future agents
- API during development: The UI may hit the hosted backend via Vite’s /api proxy or directly via API_BASE_URL. To test against a local backend, set VITE_API_BASE_URL accordingly and avoid the proxy or adjust it in vite.config.ts.
- Aliases and TS paths: Vite aliases ("@", "@shared") are mirrored in tsconfig.json paths; use them for imports rather than relative paths.
- Linting: No ESLint config is present. Use Prettier (format.fix) and tsc (typecheck) to maintain code quality.

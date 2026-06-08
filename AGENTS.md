# AGENTS.md — AITestCraft

> Compact guidance for OpenCode sessions. If a fact is obvious from filenames, it is not here.

## Repo Layout

Monorepo with two independent packages:
- `frontend/` — React 18 + Vite + TypeScript + Ant Design
- `backend/` — Express + TypeScript + Prisma (MySQL) + Socket.IO

## Commands That Matter

### Frontend (`cd frontend`)
| Command | What it does |
|---------|-------------|
| `npm run dev` | Dev server on **port 5000** (not 5173) |
| `npm run type-check` | `tsc --noEmit` |
| `npm run build` | `tsc && vite build` |
| `npm run lint` | ESLint (currently broken — see Gotchas) |

### Backend (`cd backend`)
| Command | What it does |
|---------|-------------|
| `npm run dev` | Nodemon + ts-node on **port 9000** |
| `npm run type-check` | `tsc --noEmit` |
| `npm run build` | `tsc && npm run copy:prisma` |
| `npm run lint` | ESLint (currently broken — see Gotchas) |
| `npm test` | Jest with `ts-jest` |
| `npx prisma generate` | Regenerate Prisma client after schema changes |

### Infra (repo root)
| Command | What it does |
|---------|-------------|
| `docker-compose up -d mysql redis` | MySQL (3306) + Redis (6379) only |
| `docker-compose up -d` | Full stack including backend + frontend |

## Running a Focused Verification Step

Backend type-check is the fastest safety net:
```bash
cd backend && npm run type-check
```

Frontend type-check:
```bash
cd frontend && npm run type-check
```

There is no root-level `npm test`. Each package is independent.

## Architecture Notes

### Frontend
- **Entry**: `src/main.tsx` → `App.tsx` (ConfigProvider + Router)
- **Routes**: `src/routes/AppRoutes.tsx` switches between `modern` (FeatureLayout) and `traditional` (TraditionalLayout) modes
- **Themes**: 3 themes — `light`, `dark`, `geek-light`. Dark is the default tech aesthetic. Theme CSS variables live in `src/styles/variables.css`
- **State**: `AppContext` holds the 3-step wizard state (requirement → test points → test cases)
- **Proxy**: Vite dev server proxies `/api` to `http://localhost:9000` (configured in `vite.config.ts`)

### Backend
- **Entry**: `src/index.ts` mounts ~20 route modules under `/api/*`
- **Config**: `src/config/index.ts` loads `backend/.env` via explicit path (`path.resolve(__dirname, '../../.env')`). Do not assume `.env` is in CWD
- **Prisma**: Schema at `prisma/schema.prisma`. Client is generated to `src/generated/prisma` (custom output path). If you edit the schema, run `npx prisma generate`
- **Dual DB**: MySQL (primary, via Prisma) + PostgreSQL (read-only defect data via raw `pg` queries)
- **Redis**: Optional. If unavailable, `taskPersistenceService` silently falls back to an in-memory Map
- **WebSocket**: Socket.IO shares the same HTTP server (port 9000), not a separate port

## LLM Provider Architecture

New providers are added by:
1. Extending `BaseLLMProvider` in `src/services/llm/`
2. Registering in `LLMProviderFactory`

Current providers: DeepSeek, Volcano Coding (字节), OpenCode Go.
Provider config is read from `backend/.env` + `system_configs` DB table.

## Testing

- Backend tests: `cd backend && npm test`
- Jest config: `jest.config.js` at backend root
- Test pattern: `**/__tests__/**/*.test.ts`
- No frontend tests exist currently.

## Gotchas

1. **`.env` already exists in `backend/` and contains real API keys.** It is committed to git. Do not add new secrets to it unless the user explicitly asks.
2. **Both `npm run lint` commands fail** (frontend and backend) because the ESLint config references `@typescript-eslint/recommended` which is not resolving. Use `npm run type-check` for validation instead.
3. **Frontend dev port is 5000**, preview port is 5175. The README says 5173 — that is stale.
4. **CORS origins are hardcoded** in `backend/src/config/index.ts` with specific internal IPs. If the frontend runs on a new origin, add it there.
5. **Prompt templates** live in repo root `prompts/` (not inside `backend/`). The backend loads them via `path.join(process.cwd(), '..', 'prompts', ...)`. Moving them breaks the LLM providers.
6. **Type-check order matters when touching shared types**: backend first, then frontend, because frontend consumes backend types informally via API contracts.
7. **The root `package.json` is a no-op** (only has `"test": "echo Error..."`). All real work happens in `frontend/` and `backend/`.

## Style / Workflow Conventions

- Commit messages use Chinese descriptions (e.g., `优化脚本`, `修复应用管理`).
- Prefer `logger.info('【模块】中文描述', meta)` for backend logging — the codebase has a mix of English and Chinese logs; new logs should follow the `【模块】` prefix convention.
- Frontend uses inline styles heavily (not CSS Modules). When adding dark-mode colors, use `useTheme()` from `contexts/ThemeContext` rather than hardcoding hex values.

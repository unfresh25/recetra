<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Recetra conventions

- Source of truth for product and architecture: `docs/plans/2026-10-16-recetra-design.md`.
- Code identifiers, DB schema, enums and routes in English; UI copy in Spanish (es-CO).
- Icons only via `components/ui/icon.tsx` (Hugeicons free).
- Server Supabase client (`lib/supabase/server.ts`) calls `connection()`; components that read the session must sit behind `<Suspense>` (Cache Components).
- Household writes go through `security definer` RPCs; every new household table needs RLS plus a pgTAP test in `supabase/tests/database`.

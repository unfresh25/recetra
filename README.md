<img src="assets/icon.svg" width="64" height="64" alt="">

# Recetra

Planificador semanal de comidas para el hogar: recetas reales de creadores (con crédito), lista de compras con comparación de precios entre supermercados de Barranquilla y tiendas cercanas.

Diseño completo: [`docs/plans/2026-10-16-recetra-design.md`](docs/plans/2026-10-16-recetra-design.md).

## Stack

Next.js 16 (App Router, Cache Components) · Supabase (Postgres + RLS, Auth, Storage) · Tailwind CSS 4 · Hugeicons · Vercel · Bun.

## Desarrollo local

Requisitos: Bun, Node 22, Docker y Supabase CLI.

```bash
bun install
supabase start                      # Postgres, Auth y Mailpit en Docker
cp .env.example .env.local          # completa la key con `supabase status -o env`
bun run dev                         # http://localhost:3000
```

El login usa un código de 6 dígitos por correo. En local, los correos llegan a Mailpit: http://127.0.0.1:54324.

## Scripts

| Script | Qué hace |
|---|---|
| `bun run lint` / `typecheck` / `test` | ESLint, TypeScript y pruebas unitarias (Vitest) |
| `bun run db:test` | Pruebas de RLS con pgTAP (`supabase/tests`) |
| `bun run test:e2e` | Flujo completo con Playwright (necesita `supabase start`) |
| `bun run db:types` | Regenera `lib/supabase/database.types.ts` |
| `bun run icons` | Regenera los íconos PNG desde `assets/icon.svg` |

## Convenciones

- Código, base de datos y rutas en **inglés**; textos de la interfaz en **español (es-CO)**.
- Íconos siempre a través de `components/ui/icon.tsx`.
- Escrituras sensibles en la base de datos pasan por funciones RPC `security definer`; las tablas del hogar están protegidas con RLS.

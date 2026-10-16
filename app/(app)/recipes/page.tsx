import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { listFavorites, listHouseholdImports } from "@/lib/recipes/queries";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Recetas" };

const TABS = [
  { value: "mine", label: "Mis recetas" },
  { value: "favorites", label: "Favoritos" },
] as const;

export default function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  return (
    <>
      <ScreenHeader
        title="Recetas"
        action={
          <Link
            href="/recipes/import"
            className="flex h-11 items-center gap-1.5 rounded-full bg-brand px-4 font-display font-bold text-white shadow-[0_6px_20px_rgb(232_32_42/0.28)]"
          >
            <Icon name="add" size={18} strokeWidth={2.4} />
            Añadir
          </Link>
        }
      />
      <div className="flex flex-col gap-4 px-5 pt-4">
        <Suspense fallback={<Card className="h-48 animate-pulse" />}>
          <RecipesContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function RecipesContent({ searchParams }: Pick<PageProps<"/recipes">, "searchParams">) {
  const query = await searchParams;
  const tab = query.tab === "favorites" ? "favorites" : "mine";
  const { household, member } = await requireReadyMembership();

  return (
    <>
      <nav className="grid grid-cols-2 rounded-full bg-sunken p-1" aria-label="Secciones de recetas">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === "mine" ? "/recipes" : "/recipes?tab=favorites"}
            aria-current={tab === t.value ? "page" : undefined}
            className={cn(
              "flex h-11 items-center justify-center rounded-full text-[15px] font-semibold",
              tab === t.value ? "bg-surface text-brand shadow-card" : "text-ink-muted",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "mine" ? (
        <MyRecipes householdId={household.id} />
      ) : (
        <Favorites memberId={member.id} who={typeof query.who === "string" ? query.who : "both"} />
      )}
    </>
  );
}

async function MyRecipes({ householdId }: { householdId: string }) {
  const recipes = await listHouseholdImports(householdId);
  if (!recipes.length) {
    return (
      <EmptyState
        illustration="empty-recipes"
        title="Aún no has importado recetas"
        description="Pega un link de TikTok, Instagram o YouTube y la convertimos en receta, con crédito al creador."
        action={
          <Link href="/recipes/import" className="mt-2 font-semibold text-brand">
            Importar mi primera receta
          </Link>
        }
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <RecipeCard recipe={recipe} />
        </li>
      ))}
    </ul>
  );
}

async function Favorites({ memberId, who }: { memberId: string; who: string }) {
  const [favorites, supabase] = await Promise.all([listFavorites(), createClient()]);
  const { data: members } = await supabase.from("members").select("id, display_name");
  const partner = (members ?? []).find((m) => m.id !== memberId);
  const filters = [
    { value: "both", label: "De los dos" },
    { value: "me", label: "Míos" },
    ...(partner ? [{ value: "partner", label: `De ${partner.display_name}` }] : []),
  ];
  const visible = favorites.filter((f) => {
    if (who === "me") return f.memberIds.includes(memberId);
    if (who === "partner") return partner ? f.memberIds.includes(partner.id) : false;
    return partner ? f.memberIds.includes(memberId) && f.memberIds.includes(partner.id) : true;
  });

  return (
    <>
      <div className="flex gap-2">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={`/recipes?tab=favorites&who=${f.value}`}
            aria-current={who === f.value ? "page" : undefined}
            className={cn(
              "h-9 rounded-full px-4 text-sm font-semibold leading-9",
              who === f.value ? "bg-ink text-white" : "bg-surface text-ink-muted shadow-card",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>
      {visible.length ? (
        <ul className="flex flex-col gap-3">
          {visible.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          illustration="empty-recipes"
          title={who === "both" ? "Aún no hay favoritos de los dos" : "Aún no hay favoritos"}
          description="Toca el corazón en una receta para guardarla aquí. Las favoritas de los dos salen más en el plan."
        />
      )}
    </>
  );
}

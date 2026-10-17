import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BudgetStep } from "@/components/onboarding/steps/budget-step";
import { DislikesStep } from "@/components/onboarding/steps/dislikes-step";
import { MultiSelectStep } from "@/components/onboarding/steps/multi-select-step";
import { PeopleStep } from "@/components/onboarding/steps/people-step";
import { StoresStep } from "@/components/onboarding/steps/stores-step";
import { StepShell } from "@/components/onboarding/step-shell";
import { requireMembership } from "@/lib/auth";
import { saveAllergies, saveDiets, saveKitchen, saveStyles } from "@/lib/onboarding/actions";
import {
  ALLERGEN_OPTIONS,
  DIET_OPTIONS,
  EQUIPMENT_OPTIONS,
  MAX_STYLES,
  STYLE_OPTIONS,
  type IngredientCategory,
} from "@/lib/onboarding/options";
import { isSetupStep, nextHref, previousHref, type SetupStep } from "@/lib/onboarding/steps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Configura tu hogar" };

const COPY: Record<SetupStep, { title: string; subtitle: string }> = {
  stores: { title: "¿Dónde compran?", subtitle: "Elige todas las tiendas que quieras comparar." },
  people: { title: "¿Para cuántos cocinan?", subtitle: "Ajustaremos cada porción." },
  budget: { title: "¿Cuál es su presupuesto?", subtitle: "Mantendremos el mercado de la semana dentro de él." },
  styles: { title: "¿Cuál es su estilo?", subtitle: `Elige hasta ${MAX_STYLES} estilos.` },
  kitchen: { title: "¿Qué hay en su cocina?", subtitle: "Toca todo lo que tengan o quieran usar." },
  allergies: { title: "¿Tienes alguna alergia?", subtitle: "Nunca te mostraremos recetas con estos ingredientes." },
  dislikes: { title: "¿Algo que no comas?", subtitle: "Por ejemplo cilantro o mariscos. Solo aplica para ti." },
  diet: { title: "¿Sigues alguna dieta?", subtitle: "Elige todas las que apliquen." },
};

export default function SetupStepPage({ params, searchParams }: PageProps<"/setup/[step]">) {
  return (
    <Suspense fallback={<StepSkeleton />}>
      <SetupStepContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function StepSkeleton() {
  return (
    <main aria-busy className="flex flex-1 flex-col gap-6 px-5 pt-safe">
      <div className="flex h-11 items-center gap-4">
        <span className="size-11 rounded-full bg-surface" />
        <span className="h-2 flex-1 rounded-full bg-sunken" />
      </div>
      <span className="h-9 w-3/4 animate-pulse rounded-full bg-sunken" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="h-[104px] animate-pulse rounded-card bg-surface" />
        ))}
      </div>
    </main>
  );
}

async function SetupStepContent({
  params,
  searchParams,
}: Pick<PageProps<"/setup/[step]">, "params" | "searchParams">) {
  const [{ step }, query] = await Promise.all([params, searchParams]);
  if (!isSetupStep(step)) notFound();

  const edit = query.edit === "1";
  const { member, household, setupFlow } = await requireMembership();

  if (!edit && !setupFlow.includes(step)) {
    redirect(setupFlow[0] ? `/setup/${setupFlow[0]}` : "/plan");
  }

  const flow = edit ? [step] : setupFlow;
  const next = nextHref(step, flow, edit);
  const back = previousHref(step, flow, edit);
  const progress = edit ? 1 : (flow.indexOf(step) + 1) / (flow.length + 1);
  const supabase = await createClient();

  async function myRestrictions() {
    const { data } = await supabase
      .from("restrictions")
      .select("kind, allergen, ingredient_id, ingredient_category, diet")
      .eq("member_id", member.id);
    return data ?? [];
  }

  let content: React.ReactNode;
  switch (step) {
    case "stores": {
      const [{ data: stores }, { data: chosen }] = await Promise.all([
        supabase.from("stores").select("id, name, brand_color, logo_url").order("sort_order"),
        supabase.from("household_stores").select("store_id"),
      ]);
      content = (
        <StoresStep stores={stores ?? []} initial={(chosen ?? []).map((c) => c.store_id)} nextHref={next} />
      );
      break;
    }
    case "people":
      content = <PeopleStep adults={household.servings_adults} kids={household.servings_kids} nextHref={next} />;
      break;
    case "budget":
      content = <BudgetStep initial={household.weekly_budget_cop} nextHref={next} />;
      break;
    case "styles":
      content = (
        <MultiSelectStep
          options={STYLE_OPTIONS}
          initial={household.styles}
          max={MAX_STYLES}
          min={1}
          nextHref={next}
          onSave={saveStyles}
        />
      );
      break;
    case "kitchen":
      content = (
        <MultiSelectStep
          options={EQUIPMENT_OPTIONS}
          initial={household.equipment.length ? household.equipment : ["stovetop"]}
          min={1}
          nextHref={next}
          onSave={saveKitchen}
        />
      );
      break;
    case "allergies": {
      const rows = await myRestrictions();
      content = (
        <MultiSelectStep
          options={ALLERGEN_OPTIONS}
          initial={rows.flatMap((r) => (r.kind === "allergy" && r.allergen ? [r.allergen] : []))}
          noneLabel="Ninguna"
          nextHref={next}
          onSave={saveAllergies}
        />
      );
      break;
    }
    case "dislikes": {
      const [rows, { data: ingredients }] = await Promise.all([
        myRestrictions(),
        supabase.from("ingredients").select("id, slug, name, aliases").order("name"),
      ]);
      content = (
        <DislikesStep
          ingredients={ingredients ?? []}
          initialIngredientIds={rows.flatMap((r) => (r.kind === "dislike" && r.ingredient_id ? [r.ingredient_id] : []))}
          initialCategories={rows.flatMap((r) =>
            r.kind === "dislike" && r.ingredient_category ? [r.ingredient_category as IngredientCategory] : [],
          )}
          nextHref={next}
        />
      );
      break;
    }
    case "diet": {
      const rows = await myRestrictions();
      content = (
        <MultiSelectStep
          options={DIET_OPTIONS}
          initial={rows.flatMap((r) => (r.kind === "diet" && r.diet ? [r.diet] : []))}
          noneLabel="Ninguna"
          footerLabel={edit ? "Guardar" : "Terminar"}
          nextHref={next}
          onSave={saveDiets}
        />
      );
      break;
    }
  }

  return (
    <StepShell title={COPY[step].title} subtitle={COPY[step].subtitle} progress={progress} backHref={back}>
      {content}
    </StepShell>
  );
}

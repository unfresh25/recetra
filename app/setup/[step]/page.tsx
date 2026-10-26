import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { PhotoOptionStep } from "@/components/onboarding/photo-option-step";
import { BudgetStep } from "@/components/onboarding/steps/budget-step";
import { DislikesStep } from "@/components/onboarding/steps/dislikes-step";
import { PeopleStep } from "@/components/onboarding/steps/people-step";
import { PreferencesStep } from "@/components/onboarding/steps/preferences-step";
import { StoresStep } from "@/components/onboarding/steps/stores-step";
import { StylesStep } from "@/components/onboarding/steps/styles-step";
import { requireMembership } from "@/lib/auth";
import { saveAllergies, saveDiets, saveKitchen } from "@/lib/onboarding/actions";
import {
  ALLERGEN_OPTIONS,
  DIET_OPTIONS,
  EQUIPMENT_OPTIONS,
  type IngredientCategory,
} from "@/lib/onboarding/options";
import {
  HOUSEHOLD_STEPS,
  INTRO_STEPS,
  isSetupStep,
  nextHref,
  onboardingProgress,
  previousHref,
} from "@/lib/onboarding/steps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Configura tu hogar" };

export default function SetupStepPage({ params, searchParams }: PageProps<"/setup/[step]">) {
  return (
    <Suspense fallback={<main className="flex flex-1 flex-col"><PanLoaderScreen /></main>}>
      <SetupStepContent params={params} searchParams={searchParams} />
    </Suspense>
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
  // Continues the bar from /onboarding: owners came through "about" + "household", invitees only "about".
  const intro = flow.some((s) => (HOUSEHOLD_STEPS as readonly string[]).includes(s)) ? INTRO_STEPS.length : 1;
  const progress = edit ? 1 : onboardingProgress(intro + flow.indexOf(step) + 1, intro + flow.length);
  const supabase = await createClient();

  async function myRestrictions() {
    const { data } = await supabase
      .from("restrictions")
      .select("kind, allergen, ingredient_id, ingredient_category, diet")
      .eq("member_id", member.id);
    return data ?? [];
  }

  if (step === "preferences") {
    return (
      <PreferencesStep
        initialMeasurement={member.measurement_system}
        initialTemperature={member.temperature_unit}
        progress={progress}
        back={back}
        nextHref={next}
      />
    );
  }

  if (step === "stores") {
    const [{ data: stores }, { data: chosen }] = await Promise.all([
      supabase.from("stores").select("id, name, brand_color, logo_url").order("sort_order"),
      supabase.from("household_stores").select("store_id"),
    ]);
    return (
      <StoresStep
        stores={stores ?? []}
        initial={(chosen ?? []).map((c) => c.store_id)}
        progress={progress}
        back={back}
        nextHref={next}
      />
    );
  }

  if (step === "people") {
    return (
      <PeopleStep
        adults={household.servings_adults}
        kids={household.servings_kids}
        progress={progress}
        back={back}
        nextHref={next}
      />
    );
  }

  if (step === "budget") {
    return (
      <BudgetStep
        initial={household.weekly_budget_cop}
        adults={household.servings_adults}
        kids={household.servings_kids}
        progress={progress}
        back={back}
        nextHref={next}
      />
    );
  }

  if (step === "styles") {
    return (
      <StylesStep
        initial={household.styles}
        progress={progress}
        back={back}
        nextHref={next}
      />
    );
  }

  if (step === "kitchen") {
    return (
      <PhotoOptionStep
        title="¿Qué hay en tu cocina?"
        subtitle="Selecciona todo lo que tengas o quieras usar."
        options={EQUIPMENT_OPTIONS}
        initial={household.equipment.length ? household.equipment : ["stovetop"]}
        min={1}
        onSave={saveKitchen}
        progress={progress}
        back={back}
        nextHref={next}
      />
    );
  }

  if (step === "allergies") {
    const rows = await myRestrictions();
    return (
      <PhotoOptionStep
        title="¿Tienes alguna alergia?"
        subtitle="Nunca te mostraremos recetas con estos ingredientes."
        options={ALLERGEN_OPTIONS}
        initial={rows.flatMap((r) => (r.kind === "allergy" && r.allergen ? [r.allergen] : []))}
        min={0}
        onSave={saveAllergies}
        progress={progress}
        back={back}
        nextHref={next}
      />
    );
  }

  if (step === "dislikes") {
    const [rows, { data: ingredients }] = await Promise.all([
      myRestrictions(),
      supabase.from("ingredients").select("id, slug, name, aliases").order("name"),
    ]);
    return (
      <DislikesStep
        ingredients={ingredients ?? []}
        initialIngredientIds={rows.flatMap((r) => (r.kind === "dislike" && r.ingredient_id ? [r.ingredient_id] : []))}
        initialCategories={rows.flatMap((r) =>
          r.kind === "dislike" && r.ingredient_category ? [r.ingredient_category as IngredientCategory] : [],
        )}
        progress={progress}
        back={back}
        nextHref={next}
      />
    );
  }

  if (step === "diet") {
    const rows = await myRestrictions();
    return (
      <PhotoOptionStep
        title="¿Sigues alguna de las siguientes dietas?"
        subtitle="Solo te mostraremos recetas para tu dieta."
        options={DIET_OPTIONS}
        initial={rows.flatMap((r) => (r.kind === "diet" && r.diet ? [r.diet] : []))}
        min={0}
        done={next === "/plan"}
        onSave={saveDiets}
        progress={progress}
        back={back}
        nextHref={next}
      />
    );
  }

  notFound();
}

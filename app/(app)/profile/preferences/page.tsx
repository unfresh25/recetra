import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import {
  ALLERGEN_OPTIONS,
  CATEGORY_LABELS,
  DIET_OPTIONS,
  EQUIPMENT_OPTIONS,
  STYLE_OPTIONS,
  budgetTier,
  formatCop,
} from "@/lib/onboarding/options";
import type { SetupStep } from "@/lib/onboarding/steps";
import { getPreferenceRows } from "@/lib/household/queries";

export const metadata: Metadata = { title: "Mis preferencias" };

export default function PreferencesPage() {
  return (
    <>
      <ScreenHeader title="Preferencias" backHref="/profile" />
      <div className="flex flex-col gap-6 px-5 pt-4">
        <Suspense fallback={<PanLoaderScreen />}>
          <Preferences />
        </Suspense>
      </div>
    </>
  );
}

function labelsFor(options: { value: string; label: string }[], values: string[]) {
  const map = new Map(options.map((o) => [o.value, o.label]));
  return values.map((v) => map.get(v) ?? v);
}

function summary(items: string[], empty: string) {
  return items.length ? items.join(", ") : empty;
}

async function Preferences() {
  const { member, household } = await requireReadyMembership();
  const { stores, restrictions } = await getPreferenceRows(member.id);

  const rows = restrictions ?? [];
  const storeNames = (stores ?? [])
    .flatMap((s) => (s.stores ? [s.stores] : []))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => s.name);
  const people =
    `${household.servings_adults} ${household.servings_adults === 1 ? "adulto" : "adultos"}` +
    (household.servings_kids ? ` y ${household.servings_kids} ${household.servings_kids === 1 ? "niño" : "niños"}` : "");
  const dislikes = rows.flatMap((r) => {
    if (r.kind !== "dislike") return [];
    if (r.ingredients) return [r.ingredients.name];
    return r.ingredient_category ? [CATEGORY_LABELS[r.ingredient_category] ?? r.ingredient_category] : [];
  });

  const householdItems: { step: SetupStep; label: string; value: string }[] = [
    { step: "stores", label: "Tiendas", value: summary(storeNames, "Ninguna") },
    { step: "people", label: "Personas", value: people },
    {
      step: "budget",
      label: "Presupuesto semanal",
      value: household.weekly_budget_cop
        ? `${formatCop(household.weekly_budget_cop)} · ${budgetTier(household.weekly_budget_cop).label}`
        : "Sin presupuesto fijo",
    },
    { step: "styles", label: "Estilo", value: summary(labelsFor(STYLE_OPTIONS, household.styles), "Sin definir") },
    { step: "kitchen", label: "Cocina", value: summary(labelsFor(EQUIPMENT_OPTIONS, household.equipment), "Sin definir") },
  ];

  const memberItems: { step: SetupStep; label: string; value: string }[] = [
    {
      step: "preferences",
      label: "Medidas",
      value: `${member.measurement_system === "imperial" ? "Imperial" : "Métrico"} · ${member.temperature_unit === "fahrenheit" ? "°F" : "°C"}`,
    },
    {
      step: "allergies",
      label: "Alergias",
      value: summary(labelsFor(ALLERGEN_OPTIONS, rows.flatMap((r) => (r.allergen ? [r.allergen] : []))), "Ninguna"),
    },
    { step: "dislikes", label: "No como", value: summary(dislikes, "Como de todo") },
    {
      step: "diet",
      label: "Dieta",
      value: summary(labelsFor(DIET_OPTIONS, rows.flatMap((r) => (r.diet ? [r.diet] : []))), "Ninguna"),
    },
  ];

  return (
    <>
      <Section title={`Hogar · ${household.name}`} items={householdItems} />
      <Section title={`Solo para ti · ${member.display_name}`} items={memberItems} />
    </>
  );
}

function Section({ title, items }: { title: string; items: { step: SetupStep; label: string; value: string }[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{title}</h2>
      <Card className="divide-y divide-line p-0">
        {items.map((item) => (
          <Link
            key={item.step}
            href={`/setup/${item.step}?edit=1`}
            className="btn-ghost flex items-center gap-3 px-5 py-4 first:rounded-t-card last:rounded-b-card"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{item.label}</span>
              <span className="block truncate text-sm text-ink-muted">{item.value}</span>
            </span>
            <Icon name="arrow-right" size={18} className="text-ink-faint" />
          </Link>
        ))}
      </Card>
    </section>
  );
}

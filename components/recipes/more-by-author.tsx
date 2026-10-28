import { RecipeTile } from "@/components/discover/recipe-tile";
import type { DiscoverRecipe } from "@/lib/discover/queries";

export function MoreByAuthor({ author, recipes }: { author: string | null; recipes: DiscoverRecipe[] }) {
  if (!author || !recipes.length) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-[22px]">Más de {author}</h2>
      <ul className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {recipes.map((recipe) => <li key={recipe.id} className="w-[148px] shrink-0 snap-start"><RecipeTile recipe={recipe} /></li>)}
      </ul>
    </section>
  );
}

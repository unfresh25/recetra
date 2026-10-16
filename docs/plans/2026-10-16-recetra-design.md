# Recetra — Documento de diseño

**Fecha:** 2026-10-16
**Estado:** aprobado
**Referencia:** [Recipy: Planificador y Recetas](https://apps.apple.com/co/app/recipy-planificador-y-recetas/id6798486261)

## 1. Resumen

Recetra es una web app (PWA) que planifica las comidas de la semana para un hogar. Usa recetas reales de creadores (TikTok, Instagram, YouTube) con su video y su crédito, arma la lista de compras y compara precios entre supermercados de Barranquilla y Puerto Colombia.

La base es Recipy. Se conservan onboarding, plan semanal, detalle de receta, modo cocinar, lista de compras, favoritos, calorías y perfil, sin paywall. Sobre esa base, Recetra cambia esto:

| # | Recipy | Recetra |
|---|---|---|
| 1 | Solo dietas y alergias predefinidas | Alergias (estrictas) y "no me gusta" (inteligente) **por persona** |
| 2 | Catálogo cerrado de tiendas | Tiendas extensibles (Éxito, Carulla, Olímpica, D1, MegaTiendas, Makro, Jumbo, Ara, Isimo) |
| 3 | Máximo 2 tiendas | Sin límite |
| 4 | Un precio por ingrediente | Comparación de precios por tienda y mejor combinación |
| 5 | Clasificación de comidas errada | `meal_type` explícito por receta, con contexto colombiano |
| 6 | No existe | Sucursales cercanas, mapa y botón "Ruta" a Google Maps o Apple Maps |
| 7 | App iOS | Web app instalable (sin costo de Apple Developer) |
| 8 | Reacciones simples | Reacciones por persona que alimentan el aprendizaje del hogar |

### Usuarios y restricciones

- Un hogar de 2 personas, con login desde el día 1. El modelo ya soporta varios hogares.
- Presupuesto US$0 en infraestructura. Solo se paga el uso de Anthropic, estimado en US$1 al arrancar y menos de US$0,50 al mes.
- Interfaz en español (es-CO). **Todo el backend en inglés:** tablas, columnas, enums, variables y rutas.

## 2. Arquitectura

```
┌───────────────────────── Celular / navegador ─────────────────────────┐
│  Recetra (PWA Next.js) — instalable, offline para plan/recetas/lista  │
└──────────────┬────────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────┐      ┌──────────────────────────────────┐
│  Vercel (Next.js)           │      │  Supabase                        │
│  · UI (App Router)          │◄────►│  · Postgres + RLS                │
│  · Route handlers:          │      │  · Auth (Google + magic link)    │
│    import, plan, replace,   │      │  · Storage (portadas, fotos de   │
│    food photo, receipt      │      │    comida, recibos)              │
└──────┬───────────┬──────────┘      └──────────────▲───────────────────┘
       │           │                                │
  ┌────▼───┐  ┌────▼─────┐          ┌───────────────┴─────────────────┐
  │ Claude │  │ Groq     │          │ GitHub Actions                  │
  │ Haiku  │  │ Whisper  │          │ · nightly: precios por SKU      │
  │ 5.5    │  │ (free)   │          │ · weekly: sucursales (Overpass) │
  └────────┘  └──────────┘          │ · on demand: importación con    │
                                    │   audio (yt-dlp + Whisper)      │
                                    └─────────────────────────────────┘
```

### Decisiones

- **Stack:** TypeScript en todo el proyecto. Next.js (App Router) en Vercel Hobby y Supabase Free. Los scripts de los jobs se ejecutan con `tsx` en GitHub Actions.
- **El plan lo genera un algoritmo determinista, no un LLM.** Es gratis, instantáneo, predecible y se puede probar.
- **El LLM se usa solo para texto e imágenes:** importar recetas, emparejar productos, leer recibos y estimar calorías desde una foto.
- **Proveedor de IA aislado** en `lib/ai/`. Modelo: `claude-haiku-5-5` con salidas estructuradas (`output_config.format`). Cambiar de proveedor implica tocar un solo módulo.
- **Transcripción:** Groq `whisper-large-v3-turbo`, plan gratuito (20 RPM, 2.000 pedidos/día, 28.800 s de audio/día).
- **Los trabajos pesados corren en GitHub Actions**, porque se pasarían del límite de duración de las funciones de Vercel Hobby.
- **Pausa de Supabase Free** tras 7 días sin actividad: el job nocturno de precios escribe todos los días y la mantiene activa.

### Estructura del repo

```
app/                 # Next.js App Router (UI + route handlers)
components/          # UI (design system: tokens, <Icon>, cards, chips, sheets)
lib/
  ai/                # Cliente Haiku + prompts + schemas (único punto de contacto con el LLM)
  plan/              # Motor del plan (puro, sin I/O)
  pricing/           # Normalización de presentaciones, mejor tienda/combinación
  stores/            # Adaptadores: vtex.ts, instaleap.ts, manual.ts
  supabase/          # Clientes y tipos generados
jobs/                # Scripts de GitHub Actions (prices, branches, import-audio, seed)
supabase/migrations/ # SQL + políticas RLS
.github/workflows/
docs/plans/
```

## 3. Modelo de datos

🔒 = dato privado del hogar, protegido con RLS por `household_id`. El resto es catálogo compartido.

### Hogar y personas 🔒

| Tabla | Columnas clave |
|---|---|
| `households` | `id, name, city, weekly_budget_cop, servings_adults, servings_kids, equipment text[], styles text[]` |
| `members` | `id, household_id, user_id → auth.users, display_name, accent_color, role (owner\|member)` |
| `invitations` | `id, household_id, token, created_by, expires_at, used_at` (un solo uso) |
| `restrictions` | `id, member_id, kind (allergy\|dislike\|diet), ingredient_id?, ingredient_category?, diet?` |

### Recetas (catálogo compartido)

| Tabla | Columnas clave |
|---|---|
| `ingredients` | `id, slug, name, base_unit (g\|ml\|unit), category, allergens text[], aliases text[], status (active\|pending_review)` |
| `recipes` | `id, title, source_platform (tiktok\|instagram\|youtube\|manual), source_video_id, source_url, author_name, author_handle, author_url, source_image_path, servings, total_minutes, kcal_per_serving, protein_g, carbs_g, fat_g, nutrition_estimated, meal_types meal_type[], styles text[], equipment text[], visibility (public\|household), imported_by_household_id, status (pending_review\|approved\|rejected), ai_confidence` · `unique(source_platform, source_video_id)` |
| `recipe_ingredients` | `recipe_id, ingredient_id, position, quantity, unit, role (core\|accessory), substitute_ids uuid[], note` |
| `recipe_steps` | `recipe_id, position, text, video_start_seconds?` |
| `household_recipe_overrides` 🔒 | `household_id, recipe_id, cover_image_path` |

- Una receta importada entra al catálogo global. Si es `visibility = household`, solo la ve el hogar que la importó.
- Portada: `household_recipe_overrides.cover_image_path` tiene prioridad sobre `recipes.source_image_path`. La miniatura original se descarga a Storage al importar, porque las URLs de TikTok e Instagram expiran.
- Las correcciones al catálogo (`meal_types`, `role`) son globales mientras haya un solo hogar. Si la app se abre al público, necesitarán moderación.

### Gustos y aprendizaje 🔒

| Tabla | Columnas clave |
|---|---|
| `reactions` | `id, member_id, recipe_id, kind (favorite\|dislike\|veto\|cooked\|replaced), reason? (dislike\|too_slow\|too_expensive\|repeated\|not_today), plan_meal_id?, created_at` |
| `household_learned_prefs` | `household_id, max_minutes_by_meal_type jsonb, price_sensitivity numeric` |
| `recipe_scores` (vista) | `household_id, recipe_id, member_scores jsonb, combined_score` |

### Tiendas y precios

| Tabla | Columnas clave |
|---|---|
| `stores` | `id, slug, name, logo_path, source (vtex\|instaleap\|manual), base_url, api_path_prefix` |
| `branches` | `id, store_id, name, address, lat, lng, source (osm\|manual), osm_id? unique, household_id?` (🔒 si es manual) |
| `household_stores` 🔒 | `household_id, store_id` (sin límite) |
| `products` | `id, store_id, sku, name, brand, package_qty, package_unit, url, image_url, available, last_seen_at` |
| `product_matches` | `id, ingredient_id, store_id, product_id, confidence, status (auto\|pending_review\|confirmed\|rejected)` |
| `pinned_brands` 🔒 | `household_id, ingredient_id, brand` |
| `prices` | `id, product_id, price_cop, list_price_cop?, source (api\|receipt), status (approved\|pending_review), captured_at` (histórico) |
| `receipts` 🔒 | `id, household_id, store_id, photo_path, status` |

### Plan y registro 🔒

| Tabla | Columnas clave |
|---|---|
| `meal_plans` | `id, household_id, week_start, generated_at` |
| `plan_meals` | `id, meal_plan_id, day, meal_type (breakfast\|lunch\|dinner), recipe_id, servings, status (planned\|cooked\|replaced), adjustments jsonb` (ingredientes quitados y sustituidos) |
| `shopping_list_items` | `id, meal_plan_id, ingredient_id?, custom_text?, quantity, unit, checked, have_it, source (plan\|manual)` |
| `food_logs` | `id, member_id, logged_at, photo_path, kcal, protein_g, carbs_g, fat_g, recipe_id?, ai_estimated` |

### Infraestructura

- `jobs`: `id, kind, payload jsonb, status (queued|running|done|failed), attempts, run_after, last_error`. Es la cola de reintentos con espera creciente.
- **Bandeja "por confirmar"**: vista que une todo lo que está en `pending_review` (recetas, ingredientes, emparejamientos y precios de recibos).

## 4. Pipelines

### A. Importar receta

1. El usuario pega el link. En Android también puede usar el Web Share Target ("Compartir → Recetra"). En iOS no está disponible: hay que copiar y pegar.
2. Se normaliza el link a `(source_platform, source_video_id)`. Si la receta ya existe, se reutiliza sin llamar al LLM.
3. **Ruta de texto (Vercel):** se obtienen título, caption o descripción, autor y miniatura vía oEmbed o la YouTube Data API.
4. **Ruta de audio (GitHub Actions, `workflow_dispatch`):** si el texto no trae ingredientes, `yt-dlp` descarga solo el audio y Groq Whisper lo transcribe. Es uso personal aceptado por los usuarios; está en zona gris de los ToS de las plataformas.
5. Haiku devuelve JSON con esquema: ingredientes enlazados al catálogo canónico (los nuevos quedan `pending_review`), `role`, `meal_types`, estilos, equipos, porciones, pasos con `video_start_seconds` cuando se pueda, y nutrición estimada. El prompt incluye contexto colombiano (calentado, arepa con huevo y pericos son desayuno; bandeja paisa y arroz con todo son almuerzo).
6. La receta queda en `pending_review` y pasa a la bandeja. Si falla, llega a la bandeja como "No pude leer esta receta", con la opción de pegar el texto a mano.

**Carga inicial:** `jobs/seed` busca recetas colombianas en YouTube por tipo de comida y procesa unas 300. Las de confianza alta se aprueban solas; el resto va a la bandeja.

### B. Emparejar productos

Se dispara con cada ingrediente o tienda nueva:
1. Busca en la API de la tienda y filtra por categoría.
2. Haiku elige el producto y extrae la presentación ("x 30 unds" → 30 unit, "454 G" → 454 g).
3. Si la confianza es alta, queda en `auto`; si es baja, en `pending_review`.

Una vez confirmado, el emparejamiento no se recalcula.

Regla de elección: **el más barato por unidad base**, salvo que exista una marca fijada en `pinned_brands`. En ese caso se compara solo esa marca entre tiendas.

### C. Precios (nightly)

Recorre cada SKU emparejado a 1 req/s con un User-Agent identificable y solo inserta en `prices` si el precio cambió. Si un producto desaparece, queda `available = false` y se vuelve a emparejar.

Fuentes verificadas el 2026-10-16:

| Tienda | Fuente | Endpoint |
|---|---|---|
| D1, MegaTiendas, Olímpica | VTEX | `/api/catalog_system/pub/products/search/...` |
| Éxito, Carulla | VTEX (FastStore) | `/io/api/catalog_system/pub/...` |
| Makro | Instaleap (Next.js) | por investigar |
| Jumbo | VTEX? | no respondió (posible bloqueo de bots) |
| Ara, Isimo | sin tienda online | `isimo.com.co` está estacionado → recibos |

### D. Recibos

Foto del recibo → Haiku (visión) extrae las líneas → se emparejan con productos de esa tienda → los precios quedan en `pending_review` hasta que el usuario los confirma.

### E. Sucursales (weekly)

Consulta a Overpass por marca en el área de Barranquilla, Soledad y Puerto Colombia, con espera creciente (la instancia pública se satura). Hace upsert por `osm_id` y nunca toca las sucursales `manual`.

Cobertura en OSM el 2026-10-16: Olímpica 58, Ara 48, D1 23, Carulla 6, Isimo 4, Éxito 3, Jumbo 3, MegaTiendas 3, Makro 2. Los vacíos se cubren con "Mis sucursales" y con el respaldo de Google Maps.

## 5. Motor del plan

Función pura en `lib/plan/`. Llena 21 espacios (7 días × desayuno, almuerzo y cena).

1. **Filtros duros:**
   - `allergy`: se descarta la receta si tiene el ingrediente, derivados o trazas (vía `ingredients.allergens`).
   - `veto`: se descarta.
   - `dislike` sobre un ingrediente `core`: se descarta.
   - `dislike` sobre un ingrediente `accessory`: la receta se mantiene sin ese ingrediente, con sustituto sugerido y nota visible ("Sin cilantro · Jorge").
   - `meal_type` coincidente, equipos disponibles y dieta.
2. **Puntaje:** gusto combinado (el peso mayor), afinidad de estilos, tiempo frente a `max_minutes_by_meal_type`, costo frente al presupuesto y `price_sensitivity`, novedad (penaliza lo cocinado en 14 días) y reaprovechamiento de ingredientes ya elegidos en la semana.
3. **Exploración:** cerca del 15% de los espacios se reserva para recetas sin calificar.
4. **Presupuesto:** si el total se pasa, cambia las comidas más caras por alternativas más baratas con puntaje similar.
5. **Sin opciones:** el espacio queda "Sin opciones", con el motivo y una sugerencia de qué relajar. **Nunca se viola una alergia.**

### Aprendizaje

- Puntaje por persona: `favorite` +3, `cooked` +1, `dislike` −3, `veto` excluye.
- Decaimiento con vida media de unos 60 días.
- Combinación del hogar: si algún miembro tiene −3 o menos, la receta recibe una penalización fuerte; si no, se promedian los puntajes.
- Similitud: los rechazos repetidos de un tag o una proteína bajan un poco las recetas similares.

### Reemplazar

Abre una hoja con el top 5 de alternativas para el espacio y chips de motivo opcionales (un toque, se cierra solo):

| `reason` | Efecto |
|---|---|
| `dislike` | −3 al puntaje de esa persona |
| `too_slow` | Baja `max_minutes_by_meal_type` para ese tipo de comida |
| `too_expensive` | Sube `price_sensitivity` |
| `repeated` | Siguiente alternativa con otra proteína principal |
| `not_today` | Sin efecto |

## 6. Pantallas

Navegación: barra de pestañas flotante en forma de píldora: `Plan · Recetas · Compras · Calorías · Perfil`. La bandeja "por confirmar" es una 🔔 con contador en el Plan.

1. **Onboarding:**
   1. Slides de bienvenida → login → crear hogar o unirse con invitación.
   2. Tiendas (sin límite) → personas y niños.
   3. Por persona: alergias (respuesta obligatoria, con "Ninguna") → no me gusta (buscador y chips) → dieta.
   4. Presupuesto → estilos → equipos de cocina → "armando tu plan".

   El miembro invitado solo completa sus datos personales.
2. **Plan:**
   - Selector de días y tarjeta resumen (costo frente a presupuesto, acceso a Compras).
   - Por día, 3 tarjetas: etiqueta DESAYUNO, ALMUERZO o CENA, foto, título, tiempo, costo, avatares de los dos con su reacción y chips de ajuste.
   - Menú ⋯ con reemplazar y vetar.
3. **Receta:**
   - Portada editable (galería, cámara o restaurar la original) y chip del creador con link al original.
   - Datos rápidos y nutrición sin paywall.
   - ❤️ por persona, ingredientes con notas y sustitutos, pasos, botón fijo "Cocinar ahora".
4. **Modo cocinar:** video (en YouTube salta a `video_start_seconds`), paso grande, temporizadores al tocar el texto, Wake Lock (la pantalla no se apaga) y hoja de ingredientes.
5. **Compras:**
   - Resumen: "Todo en D1 $142.000" y "D1 + Olímpica −$9.000" en una píldora verde.
   - Vista por tienda o por pasillo.
   - Cada ingrediente se despliega en filas por tienda (con ✓ en el más barato, "sin precio" o "hace N días").
   - Funciona offline.
   - Sub-pestaña **Tiendas**: mapa con pines por marca, lista por distancia, botón Ruta (Google Maps, o Apple Maps en iOS), "Buscar {marca} en Google Maps" y "Agregar mi sucursal".
6. **Calorías:** por persona. Registro con foto, kcal en número grande y barra de macros segmentada.
7. **Perfil:** preferencias por persona, hogar (miembros e invitar), mis tiendas, mis sucursales, marcas fijadas, importar receta. Sin pantallas de suscripción.

URLs de Ruta:
- Google: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`
- Apple: `https://maps.apple.com/?daddr={lat},{lng}`
- Búsqueda: `https://www.google.com/maps/search/?api=1&query={marca}`

## 7. Dirección visual

Referencia principal: **BitePal**, sobre la base de Recipy.

| Elemento | Decisión |
|---|---|
| Color primario | Rojo `#E8202A`: CTA, tab activa, chips seleccionados |
| Fondo / superficies | Gris cálido `#F4F1EE` / tarjetas blancas, radio de 24–28 px, sombras mínimas |
| Ahorro | Verde `#1F9D55`, solo para "ahorras" y "más barato" |
| Personas | Un acento por miembro (coral y turquesa) en avatares y reacciones |
| Tipografía | Grotesca bold para títulos y precios (32–40 px), números tabulares en COP, etiquetas en versalitas (DESAYUNO…) |
| Íconos | **Hugeicons free** (`@hugeicons/react` + `@hugeicons/core-free-icons`, MIT), detrás de un único `<Icon name>`. Nucleo Glass es de pago y queda como opción futura |
| Ilustraciones | Comida en estilo 3D clay, luz suave, fondo transparente. **Las genera Codex** en la fase de implementación |
| Movimiento | Rebote suave en chips, hojas que suben desde abajo, pasos con slide horizontal, contador animado del ahorro |
| Densidad | Plan y Recetas con aire; Compras compacta (filas de 56 px, precios alineados a la derecha) |

### Referencias de Mobbin

- Onboarding: [BitePal restricciones](https://mobbin.com/screens/6cbf11d5-cdc6-434e-b436-7d805b539305), [MyFitnessPal dislikes](https://mobbin.com/screens/f587a0f5-496d-426a-a005-466074e343c1), [Resy alergias por persona](https://mobbin.com/screens/db56624f-7719-44fd-9326-693f4dc10d1d), [DoorDash Household Sharing](https://mobbin.com/flows/02e16d32-4461-4ffc-a98e-37d3794b6d4d)
- Plan: [Crouton Meal Plan](https://mobbin.com/screens/48f01982-c11e-4725-9514-f82d4ffd3eea), [Centr day strip](https://mobbin.com/screens/705eaf3c-a294-402a-abd2-870d1eb06136), [Wabi semana](https://mobbin.com/screens/a6147a60-54d3-46a6-9e80-4a6949846227)
- Receta y modo cocinar: [CREME creador](https://mobbin.com/screens/d2f83471-26e9-4d91-830e-c58327a643b9), [Recime ingredientes](https://mobbin.com/screens/76b7f726-05fc-41a6-bdab-aaa2024eb745), [Kitchen Stories cook mode](https://mobbin.com/screens/85a4ace6-390e-40b5-a231-14f134af1752), [Crouton cook mode](https://mobbin.com/screens/d4f7df3b-0b48-4401-b10a-81fa1514dcff)
- Compras: [GoodRx precios por tienda](https://mobbin.com/screens/78f7497b-96af-4293-9adf-25dd719527cb), [Wise "Cheapest"](https://mobbin.com/sites/sections/0cb759c3-52e6-4ab6-97f2-e18bb1ea6397), [Instacart total y ahorro](https://mobbin.com/screens/56ef29db-b9ef-4b09-861d-b84673ee4605), [Recime por pasillo](https://mobbin.com/screens/c7692449-3f88-4ae5-9ca6-7d33d7bdf0bc)
- Tiendas: [Google Maps lista y direcciones](https://mobbin.com/screens/cdf52403-8878-40f2-b7cc-126b574c8379), [Everyday Rewards pines con logo](https://mobbin.com/screens/b1560ac4-978c-4bea-b020-e0f39ecd8dcf)
- Calorías: [BitePal scanning flow](https://mobbin.com/flows/32fc5ea2-6b32-4879-bec3-33fe6f5e46c4), [BitePal detalle](https://mobbin.com/screens/3ee597a3-166f-4c92-8cda-6c9d66dd4c6d)
- Bandeja: [Instacart aprobación](https://mobbin.com/screens/d4e4f075-e8d2-4292-be15-b0bf2031b0db), [X solicitudes](https://mobbin.com/screens/0682dfc6-11c0-4dce-969d-e15b945d8304)
- Motivos: [Instacart chips](https://mobbin.com/screens/d0437f6f-2385-486b-bf3b-c4dea58395c5), [Noom reemplazar](https://mobbin.com/screens/06bceadf-50d3-4f96-8175-a90847ce33f8)

Anti-patrones que se evitan:
- Chips de muchos colores.
- Días vacíos en el plan.
- Abrir un web view para importar.
- Un botón rojo en cada fila de tienda.
- "Rechazar" escondido en un menú.
- Varias preguntas en una misma hoja.

## 8. Errores

| Falla | Comportamiento |
|---|---|
| API de tienda caída o bloqueada | Último precio con "hace N días". Si tiene más de 7 días, se muestra en gris y queda excluido de "más barato" |
| Sin precio en una tienda | "Sin precio" y aviso "faltan N precios" en el total de esa tienda |
| Producto descontinuado | Se vuelve a emparejar solo; si queda en duda, va a la bandeja |
| Importación fallida | Ítem en la bandeja con opción de pegar el texto a mano |
| Haiku, Groq u Overpass caídos | Cola `jobs` con reintentos y espera creciente |
| Restricciones imposibles | Espacio "Sin opciones" con el motivo. Nunca se viola una alergia |
| Sin conexión | Plan, recetas y lista en caché. Los checks se sincronizan al reconectar |
| Falla un job nocturno | GitHub Actions notifica por correo |

## 9. Pruebas

- **Unitarias (Vitest):**
  - Motor del plan, con pruebas de propiedades (fast-check): en ningún plan generado aparece un alérgeno.
  - Parser de presentaciones.
  - Mejor tienda y mejor combinación.
  - Decaimiento de puntajes.
- **Integración:** Supabase local (CLI + Docker). Pruebas de RLS: un hogar no puede leer datos de otro.
- **Pipelines de IA:** set fijo de unas 30 recetas con `meal_types` y `role` esperados. Se corre en cada cambio de prompt.
- **Scrapers:** pruebas de contrato contra respuestas VTEX grabadas.
- **E2E (Playwright, viewport móvil):** onboarding → plan → reemplazar → lista de compras.

## 10. Fases

| Fase | Alcance | Resultado |
|---|---|---|
| **0. Base** | Next.js + Supabase, auth, hogar e invitación, design system (tokens, `<Icon>`, componentes), PWA, CI | Los dos entran al mismo hogar |
| **1. Recetas + Plan** | Ingredientes canónicos, importación (Haiku + Whisper), bandeja, portada editable, carga inicial, onboarding, motor del plan, vista del plan, detalle, reacciones, reemplazo, modo cocinar | Uso diario sin precios |
| **2. Compras + Precios** | `stores`, adaptadores VTEX (5 tiendas), emparejamiento, precios nightly, lista con comparación y mejor combinación, marcas fijadas, offline, presupuesto real | Decidir dónde comprar |
| **3. Tiendas cercanas** | Sucursales desde OSM (weekly), mis sucursales, mapa, distancias, Ruta, respaldo de Google Maps | Llegar a la tienda |
| **4. Extras** | Calorías con foto, recibos (Ara, Isimo), Makro (Instaleap), Jumbo si se puede | Alcance completo |

## 11. Fuera de alcance (por ahora)

- App nativa en App Store o Play Store.
- Moderación del catálogo para múltiples hogares.
- Sobrados planificados (cena → almuerzo del día siguiente).
- Notificaciones push.

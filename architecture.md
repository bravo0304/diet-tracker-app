Smart Macro Architecture V2
📦 Smart Macro – Master Architecture Specification
Version

Phase 2.0 – Snapshot-Based Nutrition Engine

1️⃣ Core Architectural Philosophy

Smart Macro is built around one non-negotiable principle:

Historical days must never be mutated retroactively.

This ensures:

Analytical integrity

User trust

Long-term scalability

Clean separation of state layers

The system separates:

Layer	Purpose
profiles	Current configuration state
meals	Daily intake logs
daily_targets	Frozen daily nutrition targets
2️⃣ Technology Stack
Frontend

Static HTML

Vanilla JavaScript (no framework)

Custom CSS (responsive)

Backend

Supabase (Postgres + Auth + RLS)

Hosting

Vercel

Local Development

VS Code Live Server

Python local server fallback

Branch Strategy

main → Production

dev-clean → Active development

3️⃣ Database Architecture
🧑 profiles

One row per user.

Represents the user's current configuration state.

Columns

id (uuid, matches auth.uid())

first_name

last_name

age

sex

height_cm

weight_kg

activity_multiplier

goal (lose, maintain, gain)

created_at

Characteristics

Mutable over time

Never stores historical target data

Represents “who the user is right now”

🍽 meals

Many rows per user.

Represents intake on specific dates.

Columns

id

user_id

date (YYYY-MM-DD)

food_name

calories

protein

fat

carbs

created_at

Characteristics

Editable within allowed window

Independent of profile configuration

Pure execution layer

📅 daily_targets

One row per user per date.

Represents the frozen nutrition targets for that specific day.

Columns

id

user_id

date

calories_target

protein_target

fat_target

carbs_target

mode_used (auto | manual)

created_at

Constraints

unique(user_id, date)

Row Level Security enabled

Policies

SELECT → auth.uid() = user_id

INSERT → auth.uid() = user_id

Purpose

Prevents retroactive mutation when:

Goal changes

Activity changes

Weight changes

Manual override introduced

Once created, a snapshot is never recalculated.

4️⃣ Snapshot Workflow

When dashboard loads for a specific date:

Query daily_targets for (user_id, date)

If found → use stored targets

If not found:

Calculate targets from profiles

Insert into daily_targets

Use inserted snapshot

This guarantees historical stability.

5️⃣ Nutrition Engine

Uses Mifflin-St Jeor formula.

BMR

Male:

10W + 6.25H - 5A + 5

Female:

10W + 6.25H - 5A - 161
TDEE
BMR × activity_multiplier
Goal Multipliers
Goal	Multiplier
lose	0.85
maintain	1.0
gain	1.08
Macro Calculation

Protein:

weight_kg × 2.0 (lose)
weight_kg × 1.8 (maintain/gain)

Fat:

25% of total calories ÷ 9

Carbs:

Remaining calories ÷ 4
6️⃣ Date & Editing System
Core Variables

todayDate

selectedDate

currentAnchorDate

Week System

Monday → Sunday strip

Swipe left/right shifts by 7 days

Desktop arrows supported

Editable Window Rules

Editable:

Today

Yesterday

2 days ago

3 days ago

View-only:

Older than 3 days

Locked:

Future dates

Applies to:

Add meal

Delete meal

Edit meal

7️⃣ UI Systems
Ring System

conic-gradient based

Dynamic percent fill

Adjustable inner inset thickness

Center label: "Calories"

Responsive sizing

Macro Bars

Flex layout

Gap-based spacing

Color-coded:

Protein → red

Fat → blue

Carbs → green

Week Strip States

Selected → solid primary

Today (unselected) → outlined

View-only → faded

Future → disabled + faded

8️⃣ Implemented Features

Supabase authentication

Profile onboarding

Dashboard rendering

Add meal

Delete meal

3-day editable window logic

Future lock logic

Swipe week navigation

Responsive layout

Clean Git branch workflow

9️⃣ Features In Progress

Edit meal functionality

AI-assisted food parsing

Full daily_targets enforcement

Manual calorie mode toggle

Weekly analytics engine

Progress trend visualization

🔟 Scaling Considerations

Per user:

1 daily target per day

~365 rows/year

1,000 users:

~365,000 rows/year

PostgreSQL handles this comfortably.

Supports:

Weekly adherence

Monthly summaries

Goal change impact tracking

Long-term data integrity

11️⃣ Security Model

All user-specific tables enforce Row Level Security.

Users can:

Read only their own data

Insert only their own rows

Authentication handled by Supabase.

profiles.id = auth.uid()
12️⃣ Product Identity

Smart Macro is:

Clean

Minimal

Architecturally correct

Snapshot-based

Long-term trustworthy

AI-assisted (future)

Not over-engineered

13️⃣ Development Workflow

Develop locally

Test thoroughly

Commit to dev-clean

Merge to main only when stable

Avoid micro-deploying trivial CSS tweaks

14️⃣ Recent Implementation Updates (Post Phase 2.0)

This section reflects the latest changes made after the original architecture draft.

A. UI Structural Updates

Ring inner thickness adjusted via ::after inset control

Responsive mobile ring resizing fixed (no overflow on <768px)

Macro spacing converted to flex + gap (no padding hacks)

3-day editable window fully enforced in UI

Future dates fully locked (no add/edit/delete)

B. Editing System (Current State)

Delete meal: Implemented

Edit meal: Planned next step

Edit will reuse bottom sheet component

Editable window restriction applies to edit as well

C. Local Development Workflow

To prevent excessive Vercel build charges:

All development happens locally

Preview via VS Code Live Server or python -m http.server

Only push to dev-clean after stable testing

Merge to main only when production-ready

No micro-pushes to Vercel.

D. Branch Model

main → Production

dev-clean → Active development

Local branch must match remote when resetting:

git fetch origin
git reset --hard origin/dev-clean
E. AI Food Parsing (Planned Architecture)

AI will NOT be called directly from frontend.

Planned structure:

Frontend → Serverless Function → OpenAI API

Reasons:

Protect API key

Control usage cost

Prevent abuse

Add validation layer

AI Role:

User types: "2 eggs and 1 slice toast"

AI returns structured JSON:

{
  calories: number,
  protein: number,
  fat: number,
  carbs: number
}

Frontend auto-fills form.

Rate limiting and usage logging will be implemented before enabling publicly.

F. daily_targets Enforcement Status

Architecture designed. Full enforcement integration pending. Currently targets are calculated on load. Next step: enforce snapshot-first logic strictly.

## Phase 2.1 – Nutrition Engine Extraction

The inline nutrition calculation logic was removed from `dashboard.js`
and moved into a dedicated module: `nutrition-engine.js`.

Purpose:
- Separate calculation from UI logic
- Prepare system for snapshot-first enforcement
- Ensure dashboard does not directly compute targets

The dashboard now consumes:

calculateTargets(profile)

This creates a clean boundary between:
- Configuration layer (profiles)
- Calculation layer (engine)
- Rendering layer (dashboard)


Phase 2.2 – Snapshot Enforcement Completed

Snapshot-first enforcement has been fully integrated into the dashboard.

Changes Implemented

Created targets.js

Implemented getOrCreateDailyTarget(user_id, dateStr)

Dashboard no longer calculates targets directly

Targets now sourced exclusively from daily_targets

Nutrition math moved to nutrition-engine.js

Snapshot insertion occurs automatically on first load of a date

Architectural Impact

Historical days are immutable

Goal changes only affect dates without existing snapshots

Dashboard is now rendering-only for targets

Clear separation between:

Rendering Layer (dashboard.js)

Snapshot Layer (targets.js)

Calculation Layer (nutrition-engine.js)

Behavioral Guarantee

Past days never recalculate

Today freezes once snapshot created

Future dates use current profile state until changed

Snapshot integrity is now enforced at runtime.



15️⃣ Meal Data Model – Current State (Relational)

Smart Macro has transitioned from a flat meal model to a relational structure.

Tables Involved
meals (Container Layer)

Represents a meal event on a specific date.

Columns:

id

user_id

date

food_name (legacy display)

calories (legacy compatibility)

protein (legacy compatibility)

fat (legacy compatibility)

carbs (legacy compatibility)

created_at

Role:

Container for meal_items

Maintained for backward compatibility

Rendering still reads display values from this table

meal_items (Nutrition Source Layer)

Represents ingredient-level entries inside a meal.

Columns:

id

meal_id (FK → meals.id)

user_id

food_name

quantity

unit

calories

protein

fat

carbs

created_at

Role:

Primary source of nutrition totals

Allows ingredient breakdown

Enables structured meal composition

16️⃣ Aggregation Logic (Relational Priority System)

Dashboard totals follow this exact rule:

Fetch meals for date.

Extract meal IDs.

Fetch meal_items where meal_id IN mealIds.

If meal_items exist → aggregate from meal_items.

Else → fallback to meals table.

Implementation:

if (mealItems.length > 0) {
  aggregate meal_items
} else {
  aggregate meals
}

This guarantees:

Backward compatibility

No historical data rewrite

Smooth migration from flat to relational

Zero data breakage

17️⃣ Snapshot System (Unchanged)

daily_targets remains the immutable target layer.

Behavior:

One row per user per date

Created only if missing

Never recalculated

Cached in-memory per session

Relational meal upgrade did not alter snapshot behavior.

Snapshot integrity remains enforced.

18️⃣ Data Flow (Meal Creation)

Meal creation flow remains layered:

UI Layer → app.js

Reads inputs

Validates

Calls saveMeal()

API Layer → api.js

Inserts into meals

Inserts into meal_items

No DOM logic

Rendering Layer → dashboard.js

Fetches meals

Fetches meal_items

Aggregates totals

Updates UI

Snapshot Layer → targets.js

Ensures daily target immutability

Calculation Layer → nutrition-engine.js

Performs BMR / TDEE only

No layer merges occurred during relational upgrade.

19️⃣ Responsibility Rules

The following rules must never be violated:

dashboard.js never writes to the database.

api.js never touches the DOM.

nutrition-engine.js never accesses Supabase.

targets.js never renders UI.

app.js never performs nutrition math.

Layer violations are structural regressions.

20️⃣ Mutation Rules

profiles:

Fully mutable.

meals:

Editable only within 3-day window.

Future dates locked.

Older than 3 days view-only.

daily_targets:

Immutable once created.

Never recalculated.

Only created if missing.

No retroactive mutation of historical targets is allowed.

21️⃣ Stored vs Derived Data

Stored:

profiles configuration

meals

meal_items

daily_targets

Derived (never stored):

Daily consumed totals

Ring percentages

Macro bar percentages

Goal difference

Dashboard is a pure derived view.

22️⃣ Current System Status

Active Tables:

profiles

meals

meal_items

daily_targets

Active Aggregation Source:

meal_items (primary)

meals (fallback)

Rendering:

Reads display fields from meals

Totals derived relationally

System is:
Stable
Backward compatible
Relationally upgraded


Legacy macro columns remain in meals intentionally for compatibility and display.


20️⃣ Meal System Refactor — Ingredient-Based Architecture (Phase 1 Complete)
🔁 Previous System (Deprecated)

Previously:

meals table stored:

calories

protein

fat

carbs

Dashboard aggregated directly from meals

No ingredient-level structure

No relational breakdown

Meal detail popup did not use a separate table

This is no longer how the system works.

21️⃣ Current Data Model (Relational)
🗂 Tables
meals

Now represents:

A container only.

Columns currently in use:

id

user_id

food_name

date

created_at

⚠️ Macros in this table are now considered legacy.
They are not used for aggregation.

meal_items

Represents:

Ingredients inside a meal.

Columns:

id

meal_id (FK → meals.id)

name

calories

protein

fat

carbs

created_at

This table is now the single source of truth for nutrition data.

22️⃣ Aggregation Logic (Changed)
❌ Old Aggregation (Removed)

Dashboard previously did:

eatenCalories += m.calories;

This is no longer valid.

✅ New Aggregation

Dashboard now:

1️⃣ Fetches meals for date
2️⃣ Extracts meal IDs
3️⃣ Fetches all meal_items for those meals
4️⃣ Aggregates totals from meal_items ONLY

mealItems.forEach(item => {
  eatenCalories += item.calories || 0;
  eatenProtein += item.protein || 0;
  eatenFat += item.fat || 0;
  eatenCarbs += item.carbs || 0;
});

Meal rows also aggregate from their related meal_items.

The meals table macros are ignored entirely.

23️⃣ Manual Meal Creation — Placeholder Ingredient Strategy

When a user manually creates a meal:

System now inserts:

1️⃣ A row into meals
2️⃣ A placeholder row into meal_items

The placeholder mirrors manual macros:

meal_id: <new meal id>
name: "Manual Entry"
calories: <entered calories>
protein: <entered protein>
fat: <entered fat>
carbs: <entered carbs>

Purpose:

Keeps relational integrity

Allows ingredient popup to always show data

Keeps aggregation consistent

Prepares system for future AI ingredient injection

Prevents empty ingredient views

This ensures every meal always has at least one meal_item.

24️⃣ Dashboard Rendering Changes

Meal row macros now display:

Aggregated ingredient totals per meal:

const ingredients = mealItems.filter(item => item.meal_id === m.id);

Then:

mealCalories += item.calories;

Rendering uses:

P ${mealProtein}g
F ${mealFat}g
C ${mealCarbs}g
${mealCalories} Calories
25️⃣ Delete Behavior Updated

Deleting a meal:

Calls deleteMeal(mealId)

Reloads dashboard

Relies on database FK cascade (or manual deletion if implemented)

Delete listeners are attached AFTER DOM render.

Listeners are NOT inside the loop.

26️⃣ Meal Detail Sheet Behavior

Clicking a meal:

Fetches its meal_items

Renders each ingredient row

Displays:

Name

Calories

Protein

Fat

Carbs

Supports ingredient-level delete

Ingredient delete:

Deletes row from meal_items

Closes sheet

Reloads dashboard

27️⃣ Layer Discipline (Maintained)
UI Layer

dashboard.js handles rendering

No direct macro math outside aggregation

Data Layer

api.js handles inserts/deletes

No DOM logic

Snapshot Layer

targets.js handles daily target immutability

Auth Layer

auth.js handles session + RLS enforcement

Separation preserved.

28️⃣ RLS Considerations

All queries rely on:

.eq("user_id", user_id)

RLS must allow:

SELECT on meals

SELECT on meal_items

INSERT on meal_items

DELETE on meal_items

Scoped by user ownership.

29️⃣ Current System State Summary

✔ Ingredient-based architecture active
✔ Meals act as containers
✔ Aggregation uses meal_items only
✔ Manual meals generate placeholder ingredient
✔ Delete works
✔ Detail sheet uses relational data
✔ Future AI injection path ready

System is now structurally relational and stable.



Relational Nutrition Architecture (Current State)
Hierarchy

The system now follows a strict 3-level relational hierarchy:

Level 1 — Day

Displays daily macro totals

Displays list of meals

Totals are aggregated from meal_items only

Level 2 — Meal

Meal is a container only

Does NOT calculate macros directly

Displays list of ingredients

Meal totals = SUM of its ingredients

Level 3 — Ingredient

Stores actual macro values

Fields:

food_name

quantity

unit

calories

protein

fat

carbs

base_calories

base_protein

base_fat

base_carbs

All macro calculations in the app originate from meal_items.

Database Structure (Active)
profiles

User onboarding data.

daily_targets

Snapshot-based system.
Stores:

calories_target

protein_target

fat_target

carbs_target

mode_used

date

user_id

Used for daily macro comparison.

meals

Meal container table.

Fields:

id

user_id

food_name

date

meal_type

Legacy macro columns still exist but are NOT used for aggregation:

calories

protein

fat

carbs

These remain for backward compatibility only.

meal_items

Source of truth for macros.

Fields:

id

meal_id (FK → meals.id)

food_name

quantity

unit

base_calories

base_protein

base_fat

base_carbs

calories

protein

fat

carbs

All dashboard totals are calculated from this table.

Current Behavior

When a new meal is created:

Insert row into meals

Insert ONE placeholder row into meal_items

Same name

Same macros

quantity = 1

unit = "serving"

This allows meals to function immediately under relational architecture.

Dashboard aggregation:

Fetch meals for selected day

Fetch all meal_items for those meals

Aggregate totals from meal_items only

Meal display:

Meal row shows sum of its ingredients

Meal detail sheet shows ingredient list

Ingredient click currently logs ID (edit sheet not yet built)

Next Architectural Step

Convert Meal Detail Sheet into true Level 2 page:

Title should display meal name (not generic “Meal Details”)

Display ingredient list

Add “+ Add Ingredient” button

Ingredient click should open Level 3 Ingredient Edit Sheet

Ingredient save updates meal_items only

Meal totals auto-recalculate

Day totals auto-recalculate

This step formalizes the full Day → Meal → Ingredient hierarchy before AI integration.
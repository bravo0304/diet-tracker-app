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








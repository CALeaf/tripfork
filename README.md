# TripFork

**Compare every way your trip could go.**

TripFork is an uncertainty-aware travel planner. Instead of generating one
supposedly perfect itinerary, it builds complete alternatives and shows what
each choice costs in time, money, driving, fatigue, flexibility, and experience
coverage.

Built for the **Apps for Your Life** category of OpenAI Build Week 2026.

## The problem

Travel plans rarely have one fixed answer:

- a permit lottery may or may not work out;
- weather can move a summit, beach, or hiking day;
- a live event such as a volcanic eruption can suddenly become the priority;
- a timed reservation may force everything around it;
- the "best" route depends on which tradeoff the traveler accepts.

Most planners overwrite the old itinerary every time something changes.
TripFork keeps the alternatives visible and comparable.

## Usable MVP

The main demo is based on a real six-day American Southwest road trip whose
route changed repeatedly around **The Wave** permit lottery.

Users can:

- enter destination, dates, budget, current route, must-haves, fixed bookings,
  constraints, and the uncertain event separately;
- turn that input into a complete comparison that replaces the sample in the
  main workspace;
- compare two or three complete itinerary branches side by side;
- switch an uncertain event between pending, positive, and negative outcomes;
- see the recommended branch change without rebuilding the trip;
- compare days, estimated cost, driving, fatigue, experience coverage, route
  changes, and explicit tradeoffs;
- choose a final branch and complete a concrete action checklist;
- save, reopen, update, and delete trips through Cloudflare D1;
- export the active comparison and decisions as editable Markdown;
- generate structured branches with GPT-5.6, with a complete Hawaii fallback
  when no API key is configured.

The composer includes a second real scenario: a seven-day Hawaii Big Island
trip affected by volcano activity, Mauna Kea weather, fixed manta-ray diving,
and swimming-safety constraints.

## How GPT-5.6 is used

`POST /api/compare` sends the travel situation to the OpenAI Responses API.
GPT-5.6 separates fixed commitments, must-haves, optional experiences,
constraints, and uncertain events, then returns 2–3 complete branches using
Structured Outputs.

The app has an explicit demo fallback so the complete creation, comparison,
decision, save, and export loop remains testable without an API key.

## Run locally

Requirements:

- Node.js 22.13 or newer
- an OpenAI API key for live branch generation

```bash
npm install
cp .env.example .env.local
# Add OPENAI_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validate

```bash
npm run build
npm test
npm run lint
```

## Stack

- Next.js-compatible React application built with vinext
- TypeScript
- OpenAI Responses API
- GPT-5.6
- Zod-backed Structured Outputs
- Cloudflare D1 persistence with Drizzle-managed schema migrations
- Cloudflare Worker-compatible build

## Product direction

The next product layer is a persistent decision graph:

1. import bookings, saved places, and rough notes;
2. connect live availability and price sources instead of asking users to
   verify them manually;
3. merge the best parts of different branches;
4. activate a branch when an uncertainty resolves;
5. recompute affected reservations, driving, and deadlines;
6. preserve why rejected branches were rejected.

## Project status

This repository contains the Build Week MVP. Estimated costs, reminder dates,
weather, permits, safety details, and availability are not live and must be
verified before booking.

## The problem

The UC Riverside School of Business runs an Emerging Careers Summit — attendees, a full day, and a set of concurrent sessions with real room limits. It needed three things a spreadsheet on its own can't do during a live event: fast check-in at the door, a way to stop sessions from overfilling, and live visibility for the people running the floor. And it needed them by a fixed date.

## Context

This wasn't a hypothetical side project. It was built for a real event, with real operational users — organizers and floor staff — and no second chance to get it right on the day. That constraint drove most of the design decisions: it had to be something non-technical staff could pick up in a minute, and it couldn't depend on infrastructure that might not be ready in time.

## Discovery

I walked the actual day in my head with the organizers: someone arrives, finds their session, a host checks them in, and at some point a popular session hits capacity and people need to be sent somewhere else. Two distinct jobs fell out of that — a **Floor Host** working the door, and an **Admin** watching the whole floor — which became the two role-based views the tool is built around.

## What I built

A single Streamlit app backed by the Google Sheets API:

- **QR check-in** with **UCR email validation**, so the roster stayed clean and attendees were who they said they were.
- **Role-based workflows** — a focused Floor Host flow for checking people in, and an Admin flow for oversight and overrides.
- **Real-time occupancy and capacity monitoring** per session, with **capacity alerts** when a room approached its limit.
- **Session reassignment** so a full room became "here's where to send them" instead of a turned-away attendee.
- **Administrative export** for a clean record after the event.

## Decisions & tradeoffs

The most useful call was **using Google Sheets as the backend instead of standing up a database.** Organizers already lived in Sheets and trusted it; making it the source of truth meant no migration, no separate admin panel, and a fallback everyone understood if the app ever hiccupped. Streamlit kept the whole thing to one deployable surface I could iterate on quickly against a hard deadline. For a one-day event, boring and reliable beat clever and fragile.

## Outcome

The platform ran the live Summit end to end: **120+ check-ins across 18 sessions**, with organizers watching occupancy in real time and reassigning attendees on the fly. The operational win wasn't a metric on a slide — it was that nobody was standing at a full room with a clipboard trying to figure out what to do next.

## What I learned

Shipping against a real, immovable date changes how you build. You spend your budget on the few things that must work under load — check-in speed, live occupancy, a trustworthy source of truth — and you deliberately leave the rest. Watching people actually use it during the event taught me more about the workflow than any amount of up-front planning would have.

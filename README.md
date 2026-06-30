# ClickSide

ClickUp does a lot. It manages projects, tracks goals, hosts documents, runs automations, handles time tracking, and serves entire organizations across every department. For most of that, the full ClickUp interface is the right tool.

But if you are a developer who just needs to see what is on your plate, reply to a thread, and move a task forward, the full interface is more than you need. ClickSide exists for that narrower purpose.

ClickSide is a lightweight desktop companion that connects to your ClickUp workspace through the API and gives you a focused view of the tasks assigned to you. It sits on the side of your screen without getting in the way, shaped like a mobile app so it takes up minimal space while you work. When you need the full picture, maximize it. When you are done, shrink it back.

A tool from developers, for developers.

## Features

- **Task list** -- All tasks assigned to you, pulled directly from the ClickUp API and refreshed automatically.
- **Status filtering** -- Filter your list by status. Filters persist across sessions.
- **Task detail** -- Double-click any task to see its full description, metadata, priority, due date, and tags.
- **Status changes** -- Update a task's status directly from the detail view without leaving the app.
- **Comments** -- Read the full comment thread on any task and reply inline.
- **Mentions** -- Type `@` in the comment box to mention teammates. They get notified through ClickUp as expected.
- **Time tracking** -- Start and stop a timer on any task directly from the detail view. Each session creates a time entry in ClickUp. Entries are cumulative, so multiple sessions across different days add up to the total time spent. Uses the same API as the ClickUp web app, so timers started in ClickSide show up in ClickUp and vice versa.
- **Compact form factor** -- Default window size is 420x800, designed to dock to the side of your screen. Resizable and maximizable when needed.
- **Secure token storage** -- Your API token is stored locally through the OS-level Tauri store, never transmitted anywhere other than the ClickUp API.

## Stack

- **Tauri 2.0** -- Rust-based app shell. Small binary, low memory footprint, cross-platform.
- **React + TypeScript** -- Frontend UI.
- **Tailwind CSS v4** -- Styling.
- **TanStack Query** -- API state management with caching and background refresh.

## Getting started

1. Install dependencies:

```
npm install
```

2. Run in development mode:

```
npm run tauri dev
```

3. Build for production:

```
npm run tauri build
```

Installers are generated in `src-tauri/target/release/bundle/`.

## Configuration

On first launch, ClickSide asks for your ClickUp personal API token. You can generate one at:

**ClickUp > Settings > Apps > API Token**

The token starts with `pk_` and does not expire.

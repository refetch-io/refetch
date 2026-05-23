# Refetch (TanStack Start)

TanStack Start rewrite of Refetch with shadcn/ui, Tailwind CSS v4, and the Appwrite Node SDK for server-side data access.

## Setup

```bash
cd tanstack
cp env.example .env   # or symlink ../.env and trim to server-only vars
npm install
npm run dev
```

The dev server runs at [http://localhost:3000](http://localhost:3000).

## Stack

- [TanStack Start](https://tanstack.com/start) + React 19 + Vite
- [shadcn/ui](https://ui.shadcn.com) (Radix Nova preset)
- [node-appwrite](https://appwrite.io/docs/server/sdks) for Tables DB on the server
- Dashboard shell: collapsible sidebar + top header (shadcn Sidebar block pattern)

## Appwrite

Server helpers live in `src/lib/appwrite/`. Example server function: `src/server/appwrite-health.ts`.

Add UI components:

```bash
npx shadcn@latest add card
```

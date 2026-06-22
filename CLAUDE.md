# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

There are no tests configured in this project.

## Stack

- **Next.js 16** with App Router, React 19, TypeScript (strict)
- **AI:** Vercel AI SDK v5 (`ai` package) + `@ai-sdk/google` (Gemini 2.5 Flash) + `@ai-sdk/mcp`
- **UI:** shadcn/ui components in `components/ui/`, Tailwind CSS v4, `next-themes` for dark mode
- **Styling:** Orange accent theme (`hsl(16 84% 60%)`), dark mode default

## Architecture

Single-page chat UI that connects to a streaming AI endpoint backed by Gemini + MCP tools.

```
app/page.tsx
  └── components/chat/ChatShell.tsx   (useChat hook, mode state)
        ├── components/chat/MessageList.tsx   (renders messages + tool outputs)
        ├── components/chat/InputBar.tsx
        └── components/chat/SuggestedPrompts.tsx

app/api/chat/route.ts   (POST)
  ├── lib/mcp.ts          (getMcpTools() — fresh MCP client per request)
  └── streamText() → Gemini 2.5 Flash, max 5 agentic steps
```

**Tool output rendering** (`MessageList.tsx`): Tool call results are dispatched by tool name to `components/kapruka/ProductGrid.tsx`, `DeliveryQuote.tsx`, or `CheckoutPanel.tsx`. States: `input-streaming` (skeleton), `output-available` (render component), `output-error`.

**MCP integration** (`lib/mcp.ts`): Connects to `KAPRUKA_MCP_URL` (env var) on each request and auto-discovers tools — no manual tool registration needed when new MCP tools are added.

**Shopping modes** (`ModeSwitcher.tsx`): Explore / Quick Order / Delivery — the selected mode is prepended as context to each user message before sending to the API.

## Environment Variables

```
GOOGLE_GENERATIVE_AI_API_KEY=   # Gemini API key
KAPRUKA_MCP_URL=                # Kapruka MCP server URL
AI_MODEL=                       # Model string (e.g. gemini-2.5-flash)
```

## Key Utilities

- `lib/utils.ts`: `cn()` (tailwind class merging), `formatLKR()` (Sri Lankan Rupee), `truncate()`
- `@/*` path alias maps to project root

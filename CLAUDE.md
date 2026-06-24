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

## Kapruka MCP Server

**Endpoint:** `https://mcp.kapruka.com/mcp`  
**Transport:** Streamable HTTP — no authentication required.

### Available Tools

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `kapruka_search_products` | Catalog search with filtering | `q`, `category`, `min_price`, `max_price`, `in_stock_only`, `sort`, `limit`, `cursor`, `currency` |
| `kapruka_get_product` | Full product details | `product_id`, `currency` |
| `kapruka_list_categories` | Browse top-level categories | `depth` |
| `kapruka_list_delivery_cities` | Search delivery network | `query`, `limit` |
| `kapruka_check_delivery` | Verify delivery feasibility & cost | `city`, `delivery_date`, `product_id` |
| `kapruka_create_order` | Generate click-to-pay checkout link | `cart`, `recipient`, `delivery`, `sender`, `gift_message`, `currency` |
| `kapruka_track_order` | Monitor order status | `order_number` |

### Rate Limits

- 60 requests/minute per IP (all tools)
- 30 order creations/hour per IP
- 30-minute server-side cache for read operations

### UI Mapping

Tool results are dispatched by tool name in `MessageList.tsx`:
- `kapruka_search_products` → `components/kapruka/ProductGrid.tsx`
- `kapruka_check_delivery` → `components/kapruka/DeliveryQuote.tsx`
- `kapruka_create_order` → `components/kapruka/CheckoutPanel.tsx`

### CRITICAL: Tool Argument Format

All tools require arguments wrapped in a `params` object — passing fields at the top level causes a Pydantic validation error:

```js
// WRONG — causes "Field required [params]" error
callTool('kapruka_search_products', { q: 'cake', limit: 2 })

// CORRECT
callTool('kapruka_search_products', { params: { q: 'cake', limit: 2, response_format: 'json' } })
```

Always include `response_format: 'json'` — the default is `'markdown'` which strips out images and structured data. The system prompt already instructs the AI to do this (rule 8 in `app/api/chat/route.ts`).

### Actual Response Envelope

Every tool returns an MCP content array, not a plain value:

```json
{
  "content": [{ "type": "text", "text": "<JSON string here>" }],
  "structuredContent": { "result": "<same JSON string>" },
  "isError": false
}
```

To get the data: parse `result.content[0].text` as JSON.

### JSON Response Schemas (verified by live calls)

**`kapruka_search_products`** — `content[0].text` parses to:
```json
{
  "results": [
    {
      "id": "string",
      "name": "string",
      "summary": "string",
      "price": { "amount": 1500.0, "currency": "LKR" },
      "compare_at_price": { "amount": 2000.0, "currency": "LKR" },
      "in_stock": true,
      "stock_level": "low | medium | high",
      "image_url": "https://static2.kapruka.com/...",
      "category": { "id": "string", "name": "string", "slug": "string" },
      "ships_internationally": false,
      "url": "https://www.kapruka.com/..."
    }
  ],
  "next_cursor": "string | null",
  "applied_filters": { "q": "string", "limit": 10, "in_stock_only": false }
}
```

**`kapruka_get_product`** — `content[0].text` parses to:
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "summary": "string",
  "price": { "amount": 1500.0, "currency": "LKR" },
  "compare_at_price": { "amount": 2000.0, "currency": "LKR" } ,
  "in_stock": true,
  "stock_level": "low | medium | high",
  "category": { "id": "string", "name": "string", "slug": "string", "path": "string" },
  "variants": [{ "id": "string", "name": "string", "sku": "string", "price": {}, "in_stock": true, "attributes": {} }],
  "images": ["https://static2.kapruka.com/...", "..."],
  "attributes": { "type": "string", "subtype": "string", "weight": "string", "vendor": "string" },
  "shipping": { "ships_from": "string", "ships_internationally": false, "restricted_countries": [] },
  "rating": null,
  "url": "https://www.kapruka.com/..."
}
```

**`kapruka_check_delivery`** — `content[0].text` parses to:
```json
{
  "city": "Colombo 01",
  "now": "2026-06-24T10:00:00+05:30",
  "checked_date": "2026-06-25",
  "available": true,
  "rate": 350,
  "currency": "LKR",
  "reason": null,
  "next_available_date": null,
  "perishable_warning": null
}
```

**`kapruka_list_delivery_cities`** — `content[0].text` parses to:
```json
{
  "cities": [{ "name": "Colombo 01", "aliases": ["Colombo1"] }],
  "total_matched": 15,
  "showing": 3
}
```

**`kapruka_list_categories`** — `content[0].text` parses to:
```json
{
  "categories": [{ "name": "cakes", "url": "https://www.kapruka.com/online/cakes", "children": [] }]
}
```

### Image URLs

- Search results include `image_url` directly — no secondary call needed when `response_format='json'`
- Product detail returns `images: [str]` — first element is the primary image
- CDN base: `https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/<path>`
- Fallback fetch: `GET /api/product-image?id=<product_id>` calls `kapruka_get_product` and extracts `images[0]`

### Test Script

`scripts/test-mcp.mjs` — calls all tools and prints raw responses. Run with:
```bash
node scripts/test-mcp.mjs
```

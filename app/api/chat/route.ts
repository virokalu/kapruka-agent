// app/api/chat/route.ts
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToModelMessages, stepCountIs, UIMessage } from 'ai';
import { getMcpTools } from '@/lib/mcp';

export const runtime = 'nodejs';
export const maxDuration = 60;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

const SYSTEM_PROMPT = `
You are Kapruka Assistant, a friendly and knowledgeable shopping agent for Kapruka.lk —
Sri Lanka's leading online shopping and gifting platform.

Your capabilities:
- Search Kapruka's catalog for any product
- Provide delivery quotes to any Sri Lankan city
- Place guest checkout orders when the user is ready

Behavioral rules:
1. ALWAYS use the search tool when a user asks about products — never invent product data.
2. After showing search results, proactively ask if they'd like a delivery quote.
3. NEVER place an order without collecting: customer name, phone, and delivery address.
4. If the user seems ready to buy but hasn't provided details, ask conversationally.
5. Respond in a warm, helpful tone — you represent a Sri Lankan brand.
6. Format prices in LKR. Be aware of Sri Lankan cities and delivery context.
7. If a search returns no results, suggest alternative search terms.
8. ALWAYS pass response_format="json" in every tool call — the UI needs structured JSON to render products, images, and delivery info correctly.
9. MESSAGE STRUCTURE — follow this order strictly every time you call a tool:
   a. Write a short intro sentence FIRST (e.g. "Here are some birthday cakes under LKR 3000:").
   b. Call the tool immediately after — do NOT list any items in text.
   c. Write your follow-up/closing sentence AFTER the tool result (e.g. "Would you like a delivery quote?").
   The UI renders product cards, delivery quotes, and checkout panels automatically from tool results.
   NEVER repeat product names, prices, or URLs in your text — doing so creates duplicate content.
`.trim();

export async function POST(req: Request) {
  /**
   * v5 change: messages are now UIMessage[] on the wire.
   * UIMessage carries richer data (parts, tool results) than the old CoreMessage.
   * convertToModelMessages() strips it down to what the LLM actually needs.
   */
  const { messages }: { messages: UIMessage[] } = await req.json();

  /**
   * Get MCP tools fresh for this request.
   * We hold a reference to `client` so we can close it in onFinish.
   */
  const { client, tools } = await getMcpTools();

  const result = streamText({
    model: google(process.env.AI_MODEL ?? 'gemini-3.1-flash-lite'),
    system: SYSTEM_PROMPT,

    /**
     * convertToModelMessages() — v5 requirement.
     * Converts UIMessage[] (which includes UI-only data like parts and
     * tool invocation states) into the lean CoreMessage[] format the
     * model provider actually understands.
     */
    messages: await convertToModelMessages(messages),

    /**
     * tools — directly from mcpClient.tools().
     * No manual Zod wrapping, no custom execute() functions.
     * The MCP client handles execution automatically when the LLM calls a tool.
     */
    tools,

    /**
     * stopWhen — v5 replacement for maxSteps.
     * stepCountIs(5) means the agentic loop runs up to 5 tool-call iterations
     * before forcing a final text response. Same behaviour, new API.
     */
    stopWhen: stepCountIs(5),

    /**
     * onFinish — close the MCP client when streaming completes.
     * This is the exact pattern shown in the official docs.
     * Keeps connections clean; no resource leaks.
     */
    onFinish: async () => {
      await client.close();
    },
  });

  /**
   * toUIMessageStreamResponse() — v5 replacement for toDataStreamResponse().
   * Serialises the stream in the new UIMessage wire format that
   * @ai-sdk/react's useChat hook expects on the client.
   */
  return result.toUIMessageStreamResponse();
}
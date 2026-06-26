import { createMCPClient } from '@ai-sdk/mcp';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';

  try {
    const client = await createMCPClient({
      transport: { type: 'http', url: process.env.KAPRUKA_MCP_URL! },
    });

    const tools = await client.tools();
    const tool  = (tools as unknown as Record<string, { execute: (args: unknown, opts?: unknown) => Promise<unknown> }>)['kapruka_list_delivery_cities'];

    if (!tool) {
      await client.close();
      return Response.json({ cities: [] });
    }

    const result = await tool.execute({ params: { query: q, limit: 10, response_format: 'json' } });
    await client.close();

    // MCP envelope: result.content[0].text is a JSON string
    const envelope = result as { content?: Array<{ type: string; text?: string }> };
    const text = envelope?.content?.[0]?.text ?? '';
    const parsed = JSON.parse(text) as { cities?: Array<{ name: string; aliases?: string[] }> };

    const cities = (parsed.cities ?? []).map(c => c.name);
    return Response.json({ cities });
  } catch {
    return Response.json({ cities: [] });
  }
}

import { createMCPClient } from '@ai-sdk/mcp';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!id) return Response.json({ error: 'Missing product ID' }, { status: 400 });

  try {
    const client = await createMCPClient({ transport: { type: 'http', url: process.env.KAPRUKA_MCP_URL! } });
    const tools  = await client.tools();
    const tool   = (tools as unknown as Record<string, { execute: (args: unknown, opts?: unknown) => Promise<unknown> }>)['kapruka_get_product'];
    if (!tool) { await client.close(); return Response.json({ error: 'Tool not found' }, { status: 404 }); }

    const result   = await tool.execute({ params: { product_id: id, response_format: 'json' } });
    await client.close();

    const envelope = result as { content?: Array<{ type: string; text?: string }> };
    const text     = envelope?.content?.[0]?.text ?? '{}';
    return Response.json(JSON.parse(text));
  } catch {
    return Response.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

import { getMcpTools } from '@/lib/mcp';

type McpContent = { type: string; text?: string; data?: string; mimeType?: string };
type McpResult = { content?: McpContent[]; isError?: boolean } | Record<string, unknown> | string;

function extractImageUrl(result: McpResult): string | null {
  let text: string | null = null;

  if (typeof result === 'string') {
    text = result;
  } else if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;

    if (typeof r.image === 'string') return r.image;
    if (typeof r.imageUrl === 'string') return r.imageUrl;
    if (Array.isArray(r.images) && typeof r.images[0] === 'string') return r.images[0] as string;

    if (Array.isArray(r.content)) {
      for (const item of r.content as McpContent[]) {
        if (item.type === 'image' && item.data) {
          return `data:${item.mimeType ?? 'image/jpeg'};base64,${item.data}`;
        }
        if (item.type === 'text' && item.text) {
          text = item.text;
          break;
        }
      }
    }
  }

  if (!text) return null;

  try {
    const obj = JSON.parse(text) as Record<string, unknown>;
    if (typeof obj.image === 'string') return obj.image;
    if (typeof obj.imageUrl === 'string') return obj.imageUrl;
    if (typeof obj.image_url === 'string') return obj.image_url;
    // kapruka_get_product JSON: images is [str]
    if (Array.isArray(obj.images)) {
      const first = obj.images[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object') {
        const f = first as Record<string, unknown>;
        if (typeof f.url === 'string') return f.url;
        if (typeof f.src === 'string') return f.src;
      }
    }
  } catch { /* not JSON */ }

  // Kapruka CDN pattern
  const cdnMatch = text.match(/https?:\/\/static\d*\.kapruka\.com\/[^\s"')>]+/);
  if (cdnMatch) return cdnMatch[0];

  // Markdown image ![alt](url)
  const mdMatch = text.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  if (mdMatch) return mdMatch[1];

  // Any image URL
  const imgMatch = text.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/i);
  if (imgMatch) return imgMatch[0];

  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ imageUrl: null }, { status: 400 });

  const { client, tools } = await getMcpTools();

  try {
    const tool = (tools as unknown as Record<string, { execute?: (args: Record<string, unknown>, opts: { toolCallId: string; messages: [] }) => Promise<McpResult> }>)['kapruka_get_product'];

    if (!tool?.execute) {
      return Response.json({ imageUrl: null });
    }

    const result = await tool.execute(
      { params: { product_id: id, currency: 'LKR', response_format: 'json' } },
      { toolCallId: 'img-fetch', messages: [] }
    );

    const imageUrl = extractImageUrl(result);
    return Response.json({ imageUrl });
  } catch {
    return Response.json({ imageUrl: null });
  } finally {
    await client.close();
  }
}

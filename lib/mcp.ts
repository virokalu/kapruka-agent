// lib/mcp.ts
import { createMCPClient } from '@ai-sdk/mcp';

/**
 * getMcpTools()
 *
 * Creates a fresh MCP client per request, fetches all tools from the
 * Kapruka MCP server, and returns them ready to pass into streamText().
 *
 * Why per-request instead of a singleton?
 * The AI SDK's createMCPClient is lightweight — it does NOT maintain a
 * persistent stateful session the way the old @modelcontextprotocol/sdk did.
 * The docs explicitly recommend closing it in onFinish, which means
 * a per-request lifecycle is the correct pattern here.
 *
 * The returned { client, tools } lets the route call client.close()
 * in the onFinish callback — exactly what the docs show.
 */
export async function getMcpTools() {
  const mcpUrl = process.env.KAPRUKA_MCP_URL;
  if (!mcpUrl) {
    throw new Error('KAPRUKA_MCP_URL is not defined in .env.local');
  }

  const client = await createMCPClient({
    transport: {
      type: 'http',
      url: mcpUrl,
    },
  });

  /**
   * mcpClient.tools() — Schema Discovery mode.
   *
   * This is the key call. It reaches out to mcp.kapruka.com,
   * fetches the full tool manifest (names, descriptions, input schemas),
   * and converts them into AI SDK-compatible tool objects.
   *
   * We use schema discovery (no explicit schemas argument) so our app
   * automatically picks up any new tools Kapruka adds to their server
   * without requiring code changes on our side.
   */
  const tools = await client.tools();

  return { client, tools };
}
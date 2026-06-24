/**
 * test-mcp.mjs
 * Run with: node scripts/test-mcp.mjs
 * Calls each Kapruka MCP tool and prints the raw results so we can
 * understand the response format (important for image URL parsing).
 */

import { createMCPClient } from '@ai-sdk/mcp';

const MCP_URL = 'https://mcp.kapruka.com/mcp';

function printSection(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function printResult(label, result) {
  console.log(`\n── ${label} ──`);
  console.log(JSON.stringify(result, null, 2));
}

async function runTests() {
  console.log('Connecting to Kapruka MCP server:', MCP_URL);
  const client = await createMCPClient({
    transport: { type: 'http', url: MCP_URL },
  });

  try {
    // ── 1. List all available tools ──────────────────────────────────────────
    printSection('1. Available Tools (tool names + descriptions)');
    const tools = await client.tools();
    const toolNames = Object.keys(tools);
    console.log('Tool count:', toolNames.length);
    for (const name of toolNames) {
      const t = tools[name];
      console.log(`\n  • ${name}`);
      console.log(`    ${t.description ?? '(no description)'}`);
    }

    // Helper: call a tool by name and return its raw result
    async function callTool(name, args) {
      const tool = tools[name];
      if (!tool?.execute) throw new Error(`Tool "${name}" has no execute fn`);
      return tool.execute(args, { toolCallId: 'test', messages: [] });
    }

    // ── 2. kapruka_list_categories ───────────────────────────────────────────
    printSection('2. kapruka_list_categories');
    const categories = await callTool('kapruka_list_categories', {
      params: { depth: 1, response_format: 'json' },
    });
    printResult('Raw result', categories);

    // ── 3. kapruka_search_products ───────────────────────────────────────────
    printSection('3. kapruka_search_products  (q="cake", limit=2)');
    const searchResult = await callTool('kapruka_search_products', {
      params: { q: 'cake', limit: 2, currency: 'LKR', response_format: 'json' },
    });
    printResult('Raw result', searchResult);

    // Extract first product ID from search to use in next calls
    let firstProductId = null;
    if (searchResult?.content) {
      for (const item of searchResult.content) {
        if (item.type === 'text' && item.text) {
          // Try JSON
          try {
            const parsed = JSON.parse(item.text);
            const products = parsed.products ?? parsed.results ?? parsed.items ?? parsed.data;
            if (Array.isArray(products) && products[0]?.id) {
              firstProductId = String(products[0].id);
              break;
            }
          } catch { /* not JSON */ }

          // Try markdown: ID: `SKU`
          const m = item.text.match(/ID:\s*`([^`]+)`/);
          if (m) { firstProductId = m[1]; break; }
        }
      }
    }
    console.log('\n  Extracted product ID:', firstProductId ?? '(none found)');

    // ── 4. kapruka_get_product ───────────────────────────────────────────────
    if (firstProductId) {
      printSection(`4. kapruka_get_product  (product_id="${firstProductId}")`);
      const product = await callTool('kapruka_get_product', {
        params: { product_id: firstProductId, currency: 'LKR', response_format: 'json' },
      });
      printResult('Raw result', product);

      // Highlight any image-related keys
      console.log('\n  Image-related fields search:');
      const text = JSON.stringify(product);
      const imageMatches = text.match(/https?:\/\/[^\s"',]+\.(?:jpg|jpeg|png|webp|gif)[^\s"',]*/gi);
      const cdnMatches  = text.match(/https?:\/\/static\d*\.kapruka\.com\/[^\s"',]*/g);
      console.log('  Image URL matches:', imageMatches ?? '(none)');
      console.log('  CDN URL matches:  ', cdnMatches  ?? '(none)');
    }

    // ── 5. kapruka_list_delivery_cities ─────────────────────────────────────
    printSection('5. kapruka_list_delivery_cities  (query="colombo")');
    const cities = await callTool('kapruka_list_delivery_cities', {
      params: { query: 'colombo', limit: 3, response_format: 'json' },
    });
    printResult('Raw result', cities);

    // ── 6. kapruka_check_delivery ────────────────────────────────────────────
    if (firstProductId) {
      printSection(`6. kapruka_check_delivery  (Colombo, tomorrow, product_id="${firstProductId}")`);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const deliveryDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
      const delivery = await callTool('kapruka_check_delivery', {
        params: { city: 'Colombo', delivery_date: deliveryDate, product_id: firstProductId, response_format: 'json' },
      });
      printResult('Raw result', delivery);
    }

  } finally {
    await client.close();
    console.log('\n✓ MCP client closed.\n');
  }
}

runTests().catch(err => {
  console.error('\n✗ Error:', err.message);
  process.exit(1);
});

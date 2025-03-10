"use strict";
import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { MCPTool } from "beeai-framework/tools/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { BeeAgent } from "beeai-framework/agents/bee/agent";
import { UnconstrainedMemory } from "beeai-framework/memory/unconstrainedMemory";
import { OllamaChatModel } from "beeai-framework/adapters/ollama/backend/chat";
import { OpenAIChatModel } from "beeai-framework/adapters/openai/backend/chat";

// Create MCP Client
const client = new Client(
  {
    name: "lumifai-client",
    version: "1.0.0",
  },
  {
    capabilities: {},
  },
);

// Connect the client to any MCP server with tools capablity
const url = new URL("http://ta-mcp.lumif.ai/sse");
await client.connect(new SSEClientTransport(url));

try {
  // Server usually supports several tools, use the factory for automatic discovery
  const tools = await MCPTool.fromClient(client);
  const agent = new BeeAgent({
    llm: new OpenAIChatModel("gpt-4o", {
      apiKey: process.env.OPENAI_API_KEY,
    }),
    memory: new UnconstrainedMemory(),
    tools,
  });
  // @modelcontextprotocol/server-everything contains "add" tool
  await agent
    .run({
      prompt:
        "Analyze the EMAs for BNB for the last 14 days in 4 hour interval windows",
    })
    .observe((emitter) => {
      emitter.on("update", async ({ data, update, meta }) => {
        console.log(`Agent (${update.key}) 🤖 : `, update.value);
      });
    });
} finally {
  // Close the MCP connection
  await client.close();
}

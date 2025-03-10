import { UnconstrainedMemory } from "beeai-framework/memory/unconstrainedMemory";
import { OpenAIChatModel } from "beeai-framework/adapters/openai/backend/chat";
import { MCPTool } from "beeai-framework/tools/mcp";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { LumifaiAgent } from '../bee/lumifai_agent.js';
import yaml from 'js-yaml';
import fs from 'fs';

interface AgentMetadata {
  name: string;
  description: string;
  keywords: string[];
  api: {
    endpoint: string;
    methods: string[];
  };
}

export class AgentFactory {
  private config: any;
  private metadata: AgentMetadata;

  constructor(yamlPath: string) {
    // Load and parse YAML configuration
    this.config = yaml.load(fs.readFileSync(yamlPath, 'utf8'));

    // Extract metadata
    this.metadata = {
      name: this.config.name,
      description: this.config.description,
      keywords: this.config.keywords,
      api: this.config.api
    };
  }

  // Get agent metadata
  getMetadata(): AgentMetadata {
    return this.metadata;
  }

  private async createMCPTool(toolConfig: any): Promise<MCPTool[]> {
    // Create MCP Client
    const client = new Client(
      {
        name: "lumifai-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    // Connect to MCP server
    const url = new URL(toolConfig.config.uri);
    await client.connect(new SSEClientTransport(url));

    // Get tools from client
    const tools = await MCPTool.fromClient(client);
    return tools;
  }

  async createAgent() {
        const framework = this.config.framework;

        switch (framework) {
          case 'bee': {
            const beeConfig = this.config.bee.agent;

            // Create base configuration
            const agentConfig: {
              llm: OpenAIChatModel;
              memory: UnconstrainedMemory;
              tools: any[];
              templates: any;
            } = {
              llm: new OpenAIChatModel(beeConfig.llm.model, {}, {
                apiKey: process.env[beeConfig.llm.config.apiKey.replace('${', '').replace('}', '')]
              }),
              memory: new UnconstrainedMemory(),
              tools: [],
              templates: beeConfig.templates
            };

            // Handle tools
            for (const tool of beeConfig.tools) {
              if (tool.type === 'mcp') {
                const mcpTools = await this.createMCPTool(tool);
                agentConfig.tools = [...agentConfig.tools, ...mcpTools];
              }
            }

            // Create LumifaiAgent instance
            const agent = new LumifaiAgent(agentConfig, {
              privateKeyPath: this.config.lumifai.privateKeyPath,
              agentRegistrationContract: this.config.lumifai.agentRegistrationContract,
              agentId: this.config.lumifai.agentId,
              rpcUrl: this.config.lumifai.rpcUrl,
              chain: this.config.lumifai.chain
            });

            // Attach metadata
            (agent as any).metadata = this.metadata;

            return agent;
          }

        case 'eliza':
          throw new Error('Eliza agent creation not implemented');

        case 'llamaindex':
          throw new Error('LlamaIndex agent creation not implemented');

        default:
          throw new Error(`Unknown framework type: ${framework}`);
      }
    }
}

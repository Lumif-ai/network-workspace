import Fastify, { FastifyInstance } from 'fastify';
import { LumifaiAgent } from '../../agents/bee/lumifai_agent.js';
import { createDataStreamResponse, pipeDataStreamToResponse, streamText } from 'ai';
import { stringify } from 'node:querystring';

interface ChatRequest {
  prompt: string;
}

interface ChatResponse {
  agentId: string;
  response: string;
}

interface ErrorResponse {
  error: string;
  message: string;
}

export class FastifyAgentServer {
  private server: FastifyInstance;
  private agent: LumifaiAgent;

  constructor(agent: LumifaiAgent) {
    this.agent = agent;
    this.server = Fastify({
      logger: true,
    });

    this.setupRoutes();
    this.setupErrorHandler();
  }

  private setupRoutes() {
    // Health check endpoint
    this.server.get('/health', async () => {
      return { status: 'ok' };
    });

    // Agent metadata endpoint
    this.server.get('/metadata', async () => {
      return {
        name: (this.agent as any).metadata.name,
        description: (this.agent as any).metadata.description,
        keywords: (this.agent as any).metadata.keywords,
        api: (this.agent as any).metadata.api,
      };
    });

    // Chat endpoint
    this.server.post<{
      Body: {
        messages: Array<{
          role: string;
          content: Array<{
            type: string;
            text: string;
          }>;
        }>;
        tools: Array<any>;
        unstable_assistantMessageId: string;
        runConfig: Record<string, any>;
      };
    }>('/chat', {
      schema: {
        body: {
          type: 'object',
          required: ['messages'],
          properties: {
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string' },
                  content: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string' },
                        text: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            tools: { type: 'array' },
            unstable_assistantMessageId: { type: 'string' },
            runConfig: { type: 'object' }
          }
        },
      },
      handler: async (request, reply) => {
        const lastMessage = request.body.messages[request.body.messages.length - 1];
        const prompt = lastMessage.content[0].text;

        try {
          pipeDataStreamToResponse(reply.raw, {
            status: 200,
            statusText: 'OK',
            execute: async (dataStream) => {
              const run = this.agent.run({
                prompt,
              }).observe((emitter) => {
                emitter.on("partialUpdate", async ({ update, data, meta }, event) => {
                  // dataStream.writeData(value)
                  console.log(meta, data, update, 'Event emitter');
                  if (update.key === "thought" && update.value) {
                    dataStream.write(`g:${JSON.stringify(update.value)}\n`);
                  }
                  if (update.key === "tool_output") {
                    dataStream.write(`9:${JSON.stringify({
                      toolCallId: data.tool_name,
                      toolName: data.tool_name,
                      args: data.tool_input,
                    })}\n`);
                  }
                  if (update.key === 'final_answer' && update.value) {
                    dataStream.write(`0:${JSON.stringify(update.value)}\n`);
                  }
                });
              });
              await run;
            }
          });

        } catch (error) {
          this.server.log.error(error);
          reply.status(500).send({
            error: 'Failed to process chat request',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    });
  }

  private setupErrorHandler() {
    this.server.setErrorHandler((error, request, reply) => {
      console.error(error);
      this.server.log.error(error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message,
      });
    });
  }

  async start(port: number = 3000) {
    try {
      await this.server.listen({ port });
      this.server.log.info(`Server listening on port ${port}`);
    } catch (err) {
      this.server.log.error(err);
      process.exit(1);
    }
  }

  async stop() {
    try {
      await this.server.close();
      this.server.log.info('Server stopped');
    } catch (err) {
      this.server.log.error(err);
      process.exit(1);
    }
  }
}

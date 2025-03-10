'use strict';
import path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { AgentFactory } from './agents/base/agent_factory.js';
import { FastifyAgentServer } from './server/fastify/fastify_agent_server.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function main() {
    try {
        // Create agent from factory
        const factory = new AgentFactory(path.join(__dirname, 'agent_archetype.yaml'));
        const agent = await factory.createAgent();
        // Create and start server
        const server = new FastifyAgentServer(agent);
        await server.start(3000);
        await agent.initialize();
        // Handle shutdown gracefully
        process.on('SIGTERM', async () => {
            await server.stop();
        });
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
main();

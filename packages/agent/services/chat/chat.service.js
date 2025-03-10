import { runAgent } from '../../agents/ta-agent/agent.js';

export class ChatService {
  constructor(dependencies = {}) {
    this.dependencies = dependencies;
  }

  streamChat(messages) {
    // Example streaming response
    return runAgent(messages);
    // yield "Processing message...\n";

    // // Simulate some async processing
    // await new Promise(resolve => setTimeout(resolve, 100));
    // yield "Analyzing...\n";

    // await new Promise(resolve => setTimeout(resolve, 100));
    // yield `Final response: ${message}\n`;
  }
}

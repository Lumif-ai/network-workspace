export class ChatController {
  constructor(chatService) {
    this.chatService = chatService;
  }

  async handleChatSSE(request, reply) {
    const { messages: message } = request.body;
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    try {
      for await (const chunk of this.chatService.streamChat(message)) {
        if (reply.raw.destroyed) {
          return;
        }
        // Format as SSE
        reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      // Send completion event
      reply.raw.write('event: complete\ndata: Stream completed\n\n');
      reply.raw.end();
    } catch (error) {
      if (!reply.raw.destroyed) {
        reply.raw.write(`event: error\ndata: ${error.message}\n\n`);
        reply.raw.end();
      }
    }
  }

  async handleChatStream(request, reply) {
    const { messages } = request.body;

    // Set appropriate headers for streaming
    reply.raw.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'x-vercel-ai-data-stream': 'v1'
    });

    try {
      // Stream the response
      for await (const chunk of this.chatService.streamChat(messages)) {
        // Check if client is still connected
        console.log(chunk, 'Received chunk');
        if (reply.raw.destroyed) {
          return;
        }
        reply.raw.write(chunk);
      }

      reply.raw.end();
    } catch (error) {
      // Error handling
      if (!reply.raw.destroyed) {
        reply.raw.write('Error: ' + error.message);
        reply.raw.end();
      }
    }
  }
}

'use strict'
import { ChatService } from '../services/chat/chat.service.js';
import { ChatController } from '../controllers/chat/chat.controller.js';
import { chatStreamSchema } from '../schemas/chat/chat.schema.js';


export default async function (fastify, opts) {
  const chatService = new ChatService();
    const chatController = new ChatController(chatService);
  fastify.get('/', async function (request, reply) {
    return { root: true }
  })

  fastify.post('/chat', {
    handler: chatController.handleChatStream.bind(chatController),
    schema: chatStreamSchema
  });
}

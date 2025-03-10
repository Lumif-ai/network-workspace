export const chatStreamSchema = {
  body: {
    type: 'object',
    required: ['messages'],
    properties: {
      messages: { type: 'array' }
    }
  }
  // Note: No response schema needed for streaming
};

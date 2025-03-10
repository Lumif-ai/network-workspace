import "dotenv/config.js";
import { UserMessage, AssistantMessage } from "beeai-framework/backend/message";
import { OllamaChatModel } from "beeai-framework/adapters/ollama/backend/chat";

const llm = new OllamaChatModel("llama3.2");

export async function* runAgent(messages) {
    const queue = [];
    const transformedMessages = messages.map((message) => {
      if (message.role === 'user') {
        return new UserMessage(message.content);
      } else if (message.role === 'assistant') {
        return new AssistantMessage(message.content);
      }
    });

    const response = await llm
      .create({
        messages: transformedMessages,
      })
      .observe((emitter) =>
        emitter.match("*", (data, event) => {
          console.log(JSON.stringify(data?.value?.messages??{}), event, 'Event emitted');
          if (event.name === 'newToken') {
            queue.push(data.value.messages[0]?.content[0]?.text);
          }
        }),
      );

    // Yield all events from the queue
    while (queue.length > 0) {
      yield queue.shift();
    }

    // yield {
    //   text: response.getTextContent(),
    //   messages: response.messages
    // };
}

// for await (const { prompt } of reader) {
//   const response = await llm
//     .create({
//       messages: [new UserMessage(prompt)],
//     })
//     .observe((emitter) =>
//       emitter.match("*", (data, event) => {
//         reader.write(`LLM 🤖 (event: ${event.name})`, JSON.stringify(data));

//         // if you want to close the stream prematurely, just uncomment the following line
//         // callbacks.abort()
//       }),
//     );

//   reader.write(`LLM 🤖 (txt) : `, response.getTextContent());
//   reader.write(`LLM 🤖 (raw) : `, JSON.stringify(response.messages));
// }

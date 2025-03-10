// 'use client';

// import { useCompletion } from '@ai-sdk/react';

// export default function Page() {
//   const { completion, input, handleInputChange, handleSubmit } = useCompletion({
//     api: '/api/chat',
//     credentials: 'omit',
//   });

//   return (
//     <>
//       <form onSubmit={handleSubmit}>
//         <input
//           name="prompt"
//           value={input}
//           onChange={handleInputChange}
//           id="input"
//         />
//         <button type="submit">Submit</button>
//         <div>{completion}</div>
//       </form>
//     </>
//   );
// }


'use client';

import { useChat } from '@ai-sdk/react';
import { ChatSection } from '@llamaindex/chat-ui'
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { Thread } from "@/components/assistant-ui/thread";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft } from "lucide-react";


export default function Chat() {
  const handler = useChatRuntime({
    api: '/api/chat',
    credentials: 'omit',
    onResponse: (response) => {
      console.log('Response:', response);
    },
    onError: (error) => {
      console.error('Error:', error);
    },
    onFinish: (message) => {
      console.log('Chat finished', message);
    },
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const agentDetails = {
    id: searchParams.get('id') || '',
    name: searchParams.get('agentName') || '',
    description: searchParams.get('description') || '',
    keywords: searchParams.get('keywords')?.split(',') || [],
  };

  return (
    // <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      // <ChatSection handler={handler} className='w-full h-full' />
    // </div>
    <div className="flex h-dvh">
          {/* Left Panel */}
          <Card className="w-80 rounded-none border-r border-l-0 border-t-0 border-b-0">
            <CardHeader>
              <Button
                variant="ghost"
                className="w-fit pl-0 mb-4"
                onClick={() => router.push('/')}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <div className="flex justify-center mb-4">
                <Image
                  src="/lumifai-min.png"
                  alt="Agent Avatar"
                  width={60}
                  height={60}
                  className="rounded-full dark:invert"
                />
              </div>

              <CardTitle>{agentDetails?.name || 'Agent Name'}</CardTitle>
              <CardDescription>ID: {agentDetails?.id || 'Unknown ID'}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">
                  {agentDetails?.description || 'No description available'}
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {agentDetails?.keywords?.map((keyword, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                    >
                      {keyword}
                    </Badge>
                  )) || 'No keywords available'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chat Section */}
          <div className="flex-1">
            <AssistantRuntimeProvider runtime={handler}>
              <div className="h-full">
                <Thread />
              </div>
            </AssistantRuntimeProvider>
          </div>
        </div>
  );
}

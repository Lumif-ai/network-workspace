'use client'
import Image from "next/image";
import { Payment, columns } from "./columns"
import { DataTable } from "./data-table"
import { EventTable } from './event-table'
import { client } from "./viem-config"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function NetworkStatus() {
  const [chainId, setChainId] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    async function checkConnection() {
      try {
        const chain = await client.getChainId()
        setChainId(chain)
        setConnected(true)
      } catch (error) {
        setConnected(false)
        console.error('Error connecting to network:', error)
      }
    }

    checkConnection()
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant={connected ? "success" : "destructive"}>
        {connected ? "Connected" : "Disconnected"}
      </Badge>
      {chainId && (
        <Badge variant="outline">Chain {chainId}</Badge>
      )}
    </div>
  )
}

export default async function Home() {
  // const data = await getData()
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center w-full max-w-[1100px]">
        <div className="flex items-center gap-4">
          <Image
            className="dark:invert"
            src="/lumifai-min.png"
            alt="Next.js logo"
            width={70}
            height={38}
            priority
          />
          <NetworkStatus />
        </div>

        <EventTable />
        {/* <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
        </div> */}
      </main>
    </div>
  );
}

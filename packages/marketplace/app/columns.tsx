"use client"

import { ColumnDef } from "@tanstack/react-table"
import { BlockchainEvent } from './hooks/useEventMonitor'
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Payment = {
  id: string
  amount: number
  status: "pending" | "processing" | "success" | "failed"
  email: string
}

export type AgentData = {
  agentName: string
  url: string
  description: string
  keywords: string[]
}

export const columns: ColumnDef<AgentData>[] = [
  {
    accessorKey: "name",
    header: "Agent Name",
  },
  {
    accessorKey: "description",
    header: "Description",
    maxSize: 200
  },
  {
    accessorKey: "keywords",
    header: "Keywords",
  },
  {
    accessorKey: "url",
    header: "URL",
    cell: ({ row }) => {
      const router = useRouter()
      const handleClick = () => {
        router.push(`/chat?agentName=${encodeURIComponent(row.getValue("name"))}&description=${encodeURIComponent(row.getValue("description"))}&keywords=${encodeURIComponent(row.getValue("keywords"))}&id=${encodeURIComponent(row.getValue("url"))}`);
        }
      return (
        <Button variant="outline" onClick={handleClick}>
          Hire now
        </Button>
      )
    }
  },
]

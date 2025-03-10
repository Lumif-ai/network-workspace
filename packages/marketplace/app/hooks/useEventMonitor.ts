'use client'

import { useEffect, useState } from 'react'
import { CONTRACT_ADDRESS, CONTRACT_ABI, client } from '../viem-config'
import { hexToString, namehash} from 'viem'
import { normalize } from 'viem/ens'
import { AgentData } from '../columns'

export type BlockchainEvent = {
  id: string
  transactionHash: string
  blockNumber: number
  timestamp: number
}

export function useEventMonitor() {
  const [events, setEvents] = useState<AgentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let unwatch: (() => void) | undefined

    async function startEventMonitoring() {
      try {
        // Initialize with historical events
        // const historicalLogs = await client.getLogs({
        //   address: CONTRACT_ADDRESS,
        //   events: CONTRACT_ABI,
        //   fromBlock: BigInt(YOUR_START_BLOCK),
        //   toBlock: 'latest'
        // })

        // const historicalEvents = await Promise.all(
        //   historicalLogs.map(async (log) => {
        //     const block = await client.getBlock({
        //       blockNumber: log.blockNumber
        //     })

        //     return {
        //       id: `${log.transactionHash}-${log.logIndex}`,
        //       transactionHash: log.transactionHash,
        //       blockNumber: Number(log.blockNumber),
        //       timestamp: Number(block.timestamp)
        //     }
        //   })
        // )

        // setEvents(historicalEvents)
        setIsLoading(false)

        // Start watching for new events
        unwatch = client.watchEvent({
          address: CONTRACT_ADDRESS,
          events: CONTRACT_ABI,
          onLogs: async (logs) => {
            console.log('All logs:', logs)
            const newEvents = await Promise.all(
              logs.map(async (log) => {
                const block = await client.getBlock({
                  blockNumber: log.blockNumber
                })

                console.log('Log details:', log.args.uiDomain);

                const resolver = await client.getEnsResolver({
                  name: log.args.uiDomain,
                  universalResolverAddress: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
                })

                console.log('Resolver:', resolver)

                // console.log('Address', await client.getEnsAddress({
                //   name: normalize(log.args.uiDomain)
                // }))

                const name = await client.getEnsText({
                  name: normalize(log.args.uiDomain),
                  key: 'name',
                  universalResolverAddress: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
                })

                console.log('Text record:', name)

                const description = await client.getEnsText({
                  name: normalize(log.args.uiDomain),
                  key: 'description',
                  universalResolverAddress: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
                })

                const keywords = await client.getEnsText({
                  name: normalize(log.args.uiDomain),
                  key: 'keywords',
                  universalResolverAddress: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
                })

                const url = await client.getEnsText({
                  name: normalize(log.args.uiDomain),
                  key: 'url',
                  universalResolverAddress: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
                })

                return {
                  name,
                  description,
                  keywords,
                  url,
                }

                // return {
                //   id: `${log.transactionHash}-${log.logIndex}`,
                //   transactionHash: log.transactionHash,
                //   blockNumber: Number(log.blockNumber),
                //   timestamp: Number(block.timestamp)
                // }
              })
            )

            setEvents(prev => {
              // Deduplicate events by id
              const eventMap = new Map([
                ...newEvents.map(event => [event.id, event]),
                ...prev.map(event => [event.id, event])
              ])
              return Array.from(eventMap.values())
                .sort((a, b) => b.blockNumber - a.blockNumber)
            })
          },
          onError: (error) => {
            console.error('Event monitoring error:', error)
            setError(error)
          }
        })

      } catch (err) {
        console.error('Failed to start event monitoring:', err)
        setError(err instanceof Error ? err : new Error('Failed to monitor events'))
        setIsLoading(false)
      }
    }

    startEventMonitoring()

    return () => {
      if (unwatch) unwatch()
    }
  }, [])

  useEffect(() => {
    const fetchBlockNumber = async () => {
      const blockNumber = await client.getBlockNumber()
      console.log('Latest block number:', blockNumber)
    }
    fetchBlockNumber()
  }, [])

  return { events, isLoading, error }
}

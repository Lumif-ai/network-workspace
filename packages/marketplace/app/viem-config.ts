import { createPublicClient, http } from 'viem'
import { mainnet, localhost } from 'viem/chains' // or whatever chain you're using

export const client = createPublicClient({
  chain: localhost,
  transport: http()
})

// Add your smart contract details
export const CONTRACT_ADDRESS = '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0'
export const CONTRACT_ABI = [
  // Your contract ABI here
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "domain",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "uiDomain",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "accessToken",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expiration",
        "type": "uint256"
      }
    ],
    "name": "AppAuthorized",
    "type": "event"
  },
] as const

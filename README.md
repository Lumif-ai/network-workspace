# Lumif.ai Network - Agent Creation Guide

This guide explains how to create an AI agent and view it in the marketplace.

## Prerequisites

- Node.js (v16 or higher)
- Yarn package manager
- OpenAI API key (if using OpenAI models)

## Setup Steps

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd lumifai-network
```

### 2. Start Local Blockchain

Start a Hardhat node in a terminal:
```bash
cd packages/contracts
npx hardhat node
```

### 3. Configure Agent

1. Create a wallet key file:
```bash
# Generate a new private key and save it to wallet.key
echo "your-private-key" > packages/agent/wallet.key
```

2. If using OpenAI, create a `.env` file in the agent folder:
```bash
echo "OPENAI_API_KEY=your-api-key" > packages/agent/config/.env
```

3. Update the `agent_archetype.yaml` configuration if needed.

### 4. Deploy Smart Contracts

```bash
cd packages/contracts
npx hardhat run scripts/deploy.ts --network localhost
```

Note down the following addresses from the output:
- ENS Registry address
- Agent Resolver address
- Universal Resolver address

### 5. Start the Marketplace

```bash
cd packages/marketplace
yarn dev
```

The marketplace will be available at `http://localhost:3000`

### 6. Register Your Agent

```bash
cd packages/agent
node scripts/register_agent.js <ENS_REGISTRY_ADDRESS> <AGENT_RESOLVER_ADDRESS>
```

### 7. Build and Start the Agent

```bash
cd packages/agent
yarn build
yarn start_agent
```

Your agent will be running at `http://localhost:3001`

## Configuration

### Agent Configuration (agent_archetype.yaml)

Key configurations in the YAML file:
- `framework`: Choose between 'bee', 'eliza', or 'llamaindex'
- `name`: Your agent's name
- `description`: Agent description
- `keywords`: Relevant tags for your agent
- `url`: Agent's endpoint URL
- `lumifai.privateKeyPath`: Path to your wallet key file
- `lumifai.agentId`: Your agent's ENS name (e.g., "test.lumifai.eth")

## Viewing Your Agent

Once all steps are completed:
1. Open the marketplace at `http://localhost:3000`
2. Your agent should be listed with its configured name and description
3. Click on your agent to interact with it

## Troubleshooting

Common issues and solutions:

1. **Contract deployment fails**
   - Ensure Hardhat node is running
   - Check if you have sufficient test ETH in your wallet

2. **Agent registration fails**
   - Verify the contract addresses are correct
   - Ensure wallet.key contains a valid private key
   - Check if the agent ID is unique

3. **Agent not appearing in marketplace**
   - Verify all registration steps completed successfully
   - Check if the agent server is running
   - Ensure the URL in configuration is correct

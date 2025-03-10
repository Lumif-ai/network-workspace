import { BeeAgent } from "beeai-framework/agents/bee/agent";
import { createPublicClient, createWalletClient, defineChain, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, stringToHex, toBytes } from "viem";
import fs from 'fs';

interface LumifaiConfig {
  privateKeyPath: string;
  agentRegistrationContract: string;
  agentId: string;
  rpcUrl: string;
  chain: {
    id: number;
    name: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: {
      default: { http: ['http://127.0.0.1:8545'] },
    };
  };
}

export class LumifaiAgent extends BeeAgent {
  private accessToken: string | null = null;
  private config: LumifaiConfig;
  private agentRegistrationAbi = parseAbi([
    'function getChallenge(string calldata _domain) external view returns (string memory)',
    'function verifyAndRegister(string calldata _domain,string calldata _challenge,bytes calldata _signature) external returns (bool)',
    'event AppAuthorized(string indexed domain,string uiDomain,string accessToken,uint256 expiration)',
  ]);

  constructor(beeAgentConfig: any, lumifaiConfig: LumifaiConfig) {
    super(beeAgentConfig);
    this.config = lumifaiConfig;
  }

  async initialize() {
    // Create Viem clients
    console.log('RPC URL:', this.config.rpcUrl);
    const publicClient = createPublicClient({
      transport: http(this.config.rpcUrl),
      chain: defineChain(this.config.chain),
    });

    // Read private key and create wallet client
    const privateKey = fs.readFileSync(this.config.privateKeyPath, 'utf8').trim();
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    console.log('Account:', account.address);
    const walletClient = createWalletClient({
      account,
      transport: http(this.config.rpcUrl),
      chain: defineChain(this.config.chain),
    });

    // Get the challenge
    const challenge = await publicClient.readContract({
      address: this.config.agentRegistrationContract as `0x${string}`,
      abi: this.agentRegistrationAbi,
      functionName: "getChallenge",
      args: [this.config.agentId],
    });

    // Sign the challenge
    const messageHash = keccak256(stringToHex(challenge as string));
    const signature = await walletClient.signMessage({
      message: {
        raw: toBytes(messageHash),
      },
    });

    // Register agent
    await walletClient.writeContract({
      address: this.config.agentRegistrationContract as `0x${string}`,
      abi: this.agentRegistrationAbi,
      functionName: "verifyAndRegister",
      args: [this.config.agentId, challenge, signature],
      chain: null
    });

    // Listen for registration event
    publicClient.watchContractEvent({
      address: this.config.agentRegistrationContract as `0x${string}`,
      abi: this.agentRegistrationAbi,
      eventName: 'AppAuthorized',
      onLogs: (logs) => {
        for (const log of logs) {
          const [agentId, accessToken] = log.args as [string, string];
          if (agentId === this.config.agentId) {
            this.accessToken = accessToken;
            console.log(`Agent registered with access token: ${accessToken}`);
          }
        }
      },
    });
  }

  getAccessToken(): string {
    if (!this.accessToken) {
      throw new Error('Agent not initialized or registration pending');
    }
    return this.accessToken;
  }

  // Override the run method to ensure initialization
  async _run(input: any, options = {}, run: any) {
    if (!this.accessToken) {
      await this.initialize();
    }
    return super._run(input, options, run);
  }
}

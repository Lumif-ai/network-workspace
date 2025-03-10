import { BeeAgent } from "beeai-framework/agents/bee/agent";
import { createPublicClient, createWalletClient, defineChain, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, stringToHex, toBytes } from "viem";
import fs from 'fs';
export class LumifaiAgent extends BeeAgent {
    constructor(beeAgentConfig, lumifaiConfig) {
        super(beeAgentConfig);
        this.accessToken = null;
        this.agentRegistrationAbi = parseAbi([
            'function getChallenge(string calldata _domain) external view returns (string memory)',
            'function verifyAndRegister(string calldata _domain,string calldata _challenge,bytes calldata _signature) external returns (bool)',
            'event AppAuthorized(string indexed domain,string uiDomain,string accessToken,uint256 expiration)',
        ]);
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
        const account = privateKeyToAccount(privateKey);
        console.log('Account:', account.address);
        const walletClient = createWalletClient({
            account,
            transport: http(this.config.rpcUrl),
            chain: defineChain(this.config.chain),
        });
        // Get the challenge
        const challenge = await publicClient.readContract({
            address: this.config.agentRegistrationContract,
            abi: this.agentRegistrationAbi,
            functionName: "getChallenge",
            args: [this.config.agentId],
        });
        // Sign the challenge
        const messageHash = keccak256(stringToHex(challenge));
        const signature = await walletClient.signMessage({
            message: {
                raw: toBytes(messageHash),
            },
        });
        // Register agent
        await walletClient.writeContract({
            address: this.config.agentRegistrationContract,
            abi: this.agentRegistrationAbi,
            functionName: "verifyAndRegister",
            args: [this.config.agentId, challenge, signature],
            chain: null
        });
        // Listen for registration event
        publicClient.watchContractEvent({
            address: this.config.agentRegistrationContract,
            abi: this.agentRegistrationAbi,
            eventName: 'AppAuthorized',
            onLogs: (logs) => {
                for (const log of logs) {
                    const [agentId, accessToken] = log.args;
                    if (agentId === this.config.agentId) {
                        this.accessToken = accessToken;
                        console.log(`Agent registered with access token: ${accessToken}`);
                    }
                }
            },
        });
    }
    getAccessToken() {
        if (!this.accessToken) {
            throw new Error('Agent not initialized or registration pending');
        }
        return this.accessToken;
    }
    // Override the run method to ensure initialization
    async _run(input, options = {}, run) {
        if (!this.accessToken) {
            await this.initialize();
        }
        return super._run(input, options, run);
    }
}

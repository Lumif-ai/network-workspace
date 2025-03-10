'use strict'
import { fileURLToPath } from 'url';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hardhat } from 'viem/chains';
import { keccak256, stringToHex, toBytes, namehash } from "viem";
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const config = yaml.load(fs.readFileSync(path.join(__dirname, '../config/agent_archetype.yaml'), 'utf8'));
const privateKey = fs.readFileSync(config.lumifai.privateKeyPath, 'utf8').trim();
const account = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(config.lumifai.rpcUrl),
});

const walletClient = createWalletClient({
  account,
  chain: hardhat,
  transport: http(config.lumifai.rpcUrl),
});

const [, , ensRegistryAddress, agentResolverAddress] = process.argv;

const ensRegistryABI = parseAbi([
  'function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)',
]);

const agentResolverABI = parseAbi([
  'function setText(bytes32 node, string key, string value)',
]);

async function main() {
  try {
    const node = namehash("lumifai.eth");
    const label = keccak256(stringToHex(config.lumifai.agentId.split('.')[0]));
    const ttl = 0n;

    const owner = createWalletClient({
      chain: hardhat,
      account: privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'),
      transport: http(config.lumifai.rpcUrl),
    });

    // Set subnode record
    const setSubnodeHash = await owner.writeContract({
      address: ensRegistryAddress,
      abi: ensRegistryABI,
      functionName: 'setSubnodeRecord',
      args: [node, label, account.address, agentResolverAddress, ttl],
    });
    await publicClient.waitForTransactionReceipt({ hash: setSubnodeHash });

    const agentNode = namehash(config.lumifai.agentId);

    // Set text records
    const records = [
      ['name', config.name],
      ['description', config.description],
      ['keywords', config.keywords.join(',')],
      ['url', config.url],
    ];

    for (const [key, value] of records) {
      const setTextHash = await walletClient.writeContract({
        address: agentResolverAddress,
        abi: agentResolverABI,
        functionName: 'setText',
        args: [agentNode, key, value],
      });
      await publicClient.waitForTransactionReceipt({ hash: setTextHash });
    }

    console.log('Successfully set agent records');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

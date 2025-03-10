import hre from "hardhat";
import AgentRegistration from "../artifacts/contracts/LumifaiAgentRegistration.sol/LumifaiAgentRegistration.json";
import { keccak256, stringToHex, namehash, toBytes } from "viem";

async function main() {
  const [owner] = await hre.viem.getWalletClients();

  const publicClient = await hre.viem.getPublicClient();

  const agentRegistrationAddress = process.env.AGENT_REGISTRATION_ADDRESS;
  if (!agentRegistrationAddress) {
    throw new Error("AGENT_REGISTRATION_ADDRESS environment variable not set");
  }

  // Get the challenge
  const challenge = await publicClient.readContract({
    address: agentRegistrationAddress as `0x${string}`,
    abi: AgentRegistration.abi,
    functionName: "getChallenge",
    args: ["test.lumifai.eth"],
  });

  console.log("Challenge:", challenge);

  const messageHash = keccak256(stringToHex(challenge as string));

  const signature = await owner.signMessage({
    message: {
      raw: toBytes(messageHash),
    },
  });

  owner.writeContract({
    address: agentRegistrationAddress as `0x${string}`,
    abi: AgentRegistration.abi,
    functionName: "verifyAndRegister",
    args: ["test.lumifai.eth", challenge, signature],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

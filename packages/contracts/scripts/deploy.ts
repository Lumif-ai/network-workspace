import hre from "hardhat";
import AgentRegistration from "../ignition/modules/AgentRegistration";
import EnsRegistry from "../ignition/modules/EnsRegistry";
import { keccak256, stringToHex, namehash } from "viem";

async function main() {
  const { ensRegistry, agentResolver } = await hre.ignition.deploy(EnsRegistry);


  const { agentRegistration, universalResolver } = await hre.ignition.deploy(AgentRegistration, {
    parameters: {
      AgentRegistration: {
        ensRegistryAddress: ensRegistry.address,
      }
    }
  });

  const [owner] = await hre.viem.getWalletClients();

  console.log("Universal resolver address: ", universalResolver.address)
  console.log("ENS Registry address: ", ensRegistry.address)
  console.log("Agent Resolver address: ", agentResolver.address)

  await ensRegistry.write.setSubnodeOwner([
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    keccak256(stringToHex("eth")),
    owner.account.address,
  ]);

  await ensRegistry.write.setSubnodeRecord([
    namehash("eth"),
    keccak256(stringToHex("lumifai")),
    owner.account.address,
    agentResolver.address,
    BigInt(0),
  ]);

  // await ensRegistry.write.setSubnodeRecord([
  //   namehash("lumifai.eth"),
  //   keccak256(stringToHex("test")),
  //   owner.account.address,
  //   agentResolver.address,
  //   BigInt(0),
  // ]);

  // // Set the agent name, description and url records
  // await agentResolver.write.setText([
  //   namehash("test.lumifai.eth"),
  //   "name",
  //   "Test Agent",
  // ]);

  // await agentResolver.write.setText([
  //   namehash("test.lumifai.eth"),
  //   "description",
  //   "This is a test agent",
  // ]);
  // await agentResolver.write.setText([
  //   namehash("test.lumifai.eth"),
  //   "keywords",
  //   "test, agent",
  // ]);
  // await agentResolver.write.setText([
  //   namehash("test.lumifai.eth"),
  //   "url",
  //   "https://test.lumif.ai",
  // ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther, keccak256, stringToHex, namehash } from "viem";

export default buildModule("AgentRegistration", (m) => {
  // Deploy the agent registration contract
  const ensRegistryAddress = m.getParameter("ensRegistryAddress")

  // Deploy the universal resolver
  const universalResolver = m.contract("UniversalResolver", [ensRegistryAddress, []]);

  const agentRegistration = m.contract("LumifaiAgentRegistration", [ensRegistryAddress, "lumifai.eth"]);

  return { agentRegistration, universalResolver };
})

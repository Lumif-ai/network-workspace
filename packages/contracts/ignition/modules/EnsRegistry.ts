// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("AgentRegistration", (m) => {
  // Deploy the agent registration contract, agent resolver contract and the ens registry contract
  const ensRegistry = m.contract("ENSRegistry", []);
  const agentResolver = m.contract("AgentResolver", []);

  return {
    ensRegistry,
    agentResolver,
  }
})

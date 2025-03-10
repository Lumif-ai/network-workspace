import {
    loadFixture
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import {
    parseAbi,
    decodeEventLog,
    keccak256,
    stringToHex, GetContractReturnType,
    recoverMessageAddress,
    toBytes
} from "viem";
import { namehash } from "viem/ens";

describe("AgentRegistration", function () {
  // Define a fixture for base setup of network domain and other things like whitelisted domains
  async function deployNetworkFixture() {
    const [owner, addr1, addr2] = await hre.viem.getWalletClients();

    // Deploy the ENSRegistry contract
    const ensRegistry = await hre.viem.deployContract("ENSRegistry", []);

    // Deploy the public resolver
    const publicResolver = await hre.viem.deployContract("AgentResolver",);

    const agentRegistration = await hre.viem.deployContract(
      "LumifaiAgentRegistration",
      [ensRegistry.address, "lumifai.eth"]
    );

    await ensRegistry.write.setSubnodeOwner([
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      keccak256(stringToHex("eth")),
      owner.account.address,
    ]);

    const publicClient = await hre.viem.getPublicClient();

    return {
      owner,
      addr1,
      addr2,
      ensRegistry,
      agentRegistration,
      publicClient,
      publicResolver,
    };
  }

  async function registerNodeFixture(ensRegistry: GetContractReturnType, publicResolver: GetContractReturnType, publicClient: any) {
    const [owner] = await hre.viem.getWalletClients();

    await ensRegistry.write.setSubnodeRecord([
      namehash("eth"),
      keccak256(stringToHex("lumifai")),
      owner.account.address,
      ensRegistry.address,
      BigInt(0),
    ]);

    await ensRegistry.write.setSubnodeRecord([
      namehash("lumifai.eth"),
      keccak256(stringToHex("test")),
      owner.account.address,
      ensRegistry.address,
      BigInt(0),
    ]);

    // Set the agent name, description and url records
    await publicResolver.write.setText([
      namehash("test.lumifai.eth"),
      "name",
      "Test Agent",
    ]);

    await publicResolver.write.setText([
      namehash("test.lumifai.eth"),
      "description",
      "This is a test agent",
    ]);
    await publicResolver.write.setText([
      namehash("test.lumifai.eth"),
      "keywords",
      "test, agent",
    ]);
    await publicResolver.write.setText([
      namehash("test.lumifai.eth"),
      "url",
      "https://test.lumif.ai",
    ]);
  }

  async function whitelistDomainFixture(
    agentRegistration: GetContractReturnType
  ) {
    const [owner] = await hre.viem.getWalletClients();

    // Whitelist a particular domain only
    await agentRegistration.write.setUseWhitelist([true]);
    await agentRegistration.write.approveDomain(["whitelist.lumifai.eth"]);
  }

  describe("AgentRegistration", function () {
    it("should not allow outside domain approvals", async function () {
      const {
        owner,
        addr1,
        addr2,
        ensRegistry,
        agentRegistration,
        publicClient,
      } = await loadFixture(deployNetworkFixture);

      // Approve addr1 as an agent for addr2
      await expect(
        agentRegistration.write.approveDomain(["test.eth"])
      ).to.be.rejectedWith("Domain must be a subdomain of the network domain");
    });

    it("should allow within domain approvals", async function () {
      const {
        owner,
        addr1,
        addr2,
        ensRegistry,
        agentRegistration,
        publicClient,
      } = await loadFixture(deployNetworkFixture);

      // Approve addr1 as an agent for addr2
      await expect(agentRegistration.write.approveDomain(["test.lumifai.eth"]))
        .to.be.fulfilled;
    });

    it("should allow registering a domain", async function () {
      const {
        owner,
        addr1,
        addr2,
        ensRegistry,
        agentRegistration,
        publicClient,
        publicResolver,
      } = await loadFixture(deployNetworkFixture);
      await registerNodeFixture(ensRegistry, publicResolver, publicClient);

      const challengeText = await agentRegistration.read.getChallenge([
        "test.lumifai.eth",
      ]);

      const messageHash = keccak256(stringToHex(challengeText));

      const accounts = await owner.getAddresses();

      const signAccount = accounts[0];

      // Sign the challenge
      const signature = await owner.signMessage({
        account: signAccount,
        message: {
          raw: toBytes(messageHash),
        },
      });

      const address = await recoverMessageAddress({
        message: messageHash,
        signature,
      });

      // Simulate the contract call
      const result = await publicClient.simulateContract({
        address: agentRegistration.address,
        abi: agentRegistration.abi,
        functionName: "verifyAndRegister",
        account: signAccount,
        args: ["test.lumifai.eth", challengeText, signature],
      });

      expect(result.result).to.equal(true);

      // Verify and register
      const hash = await agentRegistration.write.verifyAndRegister([
        "test.lumifai.eth",
        challengeText,
        signature,
      ]);

      const receipt = await publicClient.getTransactionReceipt({
        hash,
      });

      const block = await publicClient.getBlock();

      // console.log(
      //   receipt.logs[0].topics,
      //   receipt,
      //   "Receipt for verify and register"
      // );
      // console.log(hexToString(accessToken, "string"));

      const decodedEvent = decodeEventLog({
        abi: parseAbi([
          `event AppAuthorized(string indexed domain, string accessToken, uint256 expiration)`,
        ]),
        data: receipt.logs[0].data,
        topics: receipt.logs[0].topics,
      });

      await expect(agentRegistration.read.isAppRegistered(["test.lumifai.eth"]))
        .to.be.fulfilled;

      const [hasAccess, expiration, permissions, reason] =
        await agentRegistration.read.checkAppAccess([
          "test.lumifai.eth",
          decodedEvent.args.accessToken,
        ]);

      expect(hasAccess).to.be.true;
      expect(Number(expiration)).to.be.eq(
        Number(block.timestamp) + 30 * 24 * 60 * 60
      );
    });

    it("should fail to register non whitelisted domain", async function () {
      const {
        owner,
        addr1,
        addr2,
        ensRegistry,
        agentRegistration,
        publicClient,
        publicResolver,
      } = await loadFixture(deployNetworkFixture);
      await registerNodeFixture(ensRegistry, publicResolver, publicClient);
      await whitelistDomainFixture(agentRegistration);

      const challengeText = await agentRegistration.read.getChallenge([
        "test.lumifai.eth",
      ]);

      // Sign the challenge
      const signature = await owner.signMessage({
        account: owner.account,
        message: challengeText,
      });

      const messageHash = keccak256(stringToHex(challengeText));

      // Simulate the contract call
      await expect(
        publicClient.simulateContract({
          address: agentRegistration.address,
          abi: agentRegistration.abi,
          functionName: "verifyAndRegister",
          args: ["test.lumifai.eth", challengeText, signature],
        })
      ).to.be.rejectedWith("Domain not in approved list");
    });

    it("should fail with signature from wrong account", async function () {
      const {
        owner,
        addr1,
        addr2,
        ensRegistry,
        agentRegistration,
        publicClient,
        publicResolver,
      } = await loadFixture(deployNetworkFixture);
      await registerNodeFixture(ensRegistry, publicResolver, publicClient);

      const challengeText = await agentRegistration.read.getChallenge([
        "test.lumifai.eth",
      ]);

      const messageHash = keccak256(stringToHex(challengeText));
      // Sign the challenge with addr1 instead of owner
      const signature = await addr1.signMessage({
        account: addr1.account,
        message: {
          raw: toBytes(messageHash),
        },
      });

      // Simulate the contract call
      await expect(
        publicClient.simulateContract({
          address: agentRegistration.address,
          abi: agentRegistration.abi,
          account: owner.account,
          functionName: "verifyAndRegister",
          args: ["test.lumifai.eth", challengeText, signature],
        })
      ).to.be.rejectedWith("Invalid signature");
    });

    it("should fail if caller is not domain owner", async function () {
      const {
        owner,
        addr1,
        addr2,
        ensRegistry,
        agentRegistration,
        publicClient,
        publicResolver,
      } = await loadFixture(deployNetworkFixture);
      await registerNodeFixture(ensRegistry, publicResolver, publicClient);

      const challengeText = await agentRegistration.read.getChallenge([
        "test.lumifai.eth",
      ]);

      const messageHash = keccak256(stringToHex(challengeText));
      // Sign the challenge with addr1 instead of owner
      const signature = await addr1.signMessage({
        account: addr1.account,
        message: {
          raw: toBytes(messageHash),
        },
      });

      // Simulate the contract call
      await expect(
        publicClient.simulateContract({
          address: agentRegistration.address,
          abi: agentRegistration.abi,
          account: addr1.account,
          functionName: "verifyAndRegister",
          args: ["test.lumifai.eth", challengeText, signature],
        })
      ).to.be.rejectedWith("Caller is not domain owner");
    });

    it("should fail if same challenge is used twice", async function () {
      const {
        owner,
        addr1,
        addr2,
        ensRegistry,
        agentRegistration,
        publicClient,
        publicResolver,
      } = await loadFixture(deployNetworkFixture);
      await registerNodeFixture(ensRegistry, publicResolver, publicClient);

      const challengeText = await agentRegistration.read.getChallenge([
        "test.lumifai.eth",
      ]);

      const messageHash = keccak256(stringToHex(challengeText));
      const signature = await owner.signMessage({
        account: owner.account,
        message: {
          raw: toBytes(messageHash),
        },
      });

      // Simulate the contract call
      await expect(
        owner.writeContract({
          address: agentRegistration.address,
          abi: agentRegistration.abi,
          account: owner.account,
          functionName: "verifyAndRegister",
          args: ["test.lumifai.eth", challengeText, signature],
        })
      ).to.be.fulfilled;

      // Simulate the contract call
      await expect(
        publicClient.simulateContract({
          address: agentRegistration.address,
          abi: agentRegistration.abi,
          account: owner.account,
          functionName: "verifyAndRegister",
          args: ["test.lumifai.eth", challengeText, signature],
        })
      ).to.be.rejectedWith("Challenge already used");
    });

    it("should have text records set upon registration", async function() {
      const {
        owner,
        addr1,
        addr2,
        ensRegistry,
        agentRegistration,
        publicClient,
        publicResolver,
      } = await loadFixture(deployNetworkFixture);
      await registerNodeFixture(ensRegistry, publicResolver, publicClient);

      const textRecords = await publicResolver.read.text([
        namehash("test.lumifai.eth"),
        "name"
      ]);

      expect(textRecords).to.equal("Test Agent");
      const descriptionRecords = await publicResolver.read.text([
        namehash("test.lumifai.eth"),
        "description"
      ]);

      expect(descriptionRecords).to.equal("This is a test agent");
      const urlRecords = await publicResolver.read.text([
        namehash("test.lumifai.eth"),
        "url"
      ]);

      expect(urlRecords).to.equal("https://test.lumif.ai");

      const keywordsRecords = await publicResolver.read.text([
        namehash("test.lumifai.eth"),
        "keywords"
      ]);

      expect(keywordsRecords).to.equal("test, agent");
    });
  });
});

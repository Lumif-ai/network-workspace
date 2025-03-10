// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";

// import "@ensdomains/ens-contracts/contracts/resolvers/Resolver.sol";
// import "@ensdomains/ens-contracts/contracts/utils/NameEncoder.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

/**
 * @title LumifaiAgentRegistration
 * @dev Manages app registration and authorization for a decentralized network
 * using ENS subdomains directly as identifiers
 */
contract LumifaiAgentRegistration is Ownable {
  // ENS registry contract
  ENS public ensRegistry;

  // Network configuration
  string public networkDomain;
  uint256 public defaultTokenValidity = 30 days;

  // Allowed subdomain suffix (e.g., ".network.eth")
  string public requiredDomainSuffix;

  uint256 public constant CHALLENGE_VALIDITY = 5 minutes;

  // Struct to represent a registered app
  struct AppRegistration {
    bool isRegistered;
    string publicKey;
    string accessToken;
    uint256 tokenExpiration;
    string[] permissions;
    mapping(string => bool) usedChallenges; // Track used challenges to prevent replay
  }

  // Mapping from ENS domain to registration info
  mapping(string => AppRegistration) private registeredApps;

  // Whitelist of approved domains if we want to restrict access
  mapping(string => bool) public approvedDomains;
  bool public useWhitelist = false;

  // Events
  event AppAuthorized(
    string indexed domain,
    string uiDomain,
    string accessToken,
    uint256 expiration
  );
  event AuthorizationRejected(string indexed domain, string reason);
  event TokenRefreshed(
    string indexed domain,
    string newToken,
    uint256 newExpiration
  );
  event DomainApproved(string domain);
  event DomainRemoved(string domain);

  /**
   * @dev Constructor
   * @param _ensRegistry Address of the ENS registry contract
   * @param _networkDomain Base network domain (e.g., "network.eth")
   */
  constructor(address _ensRegistry, string memory _networkDomain) {
    ensRegistry = ENS(_ensRegistry);
    networkDomain = _networkDomain;
    requiredDomainSuffix = string(abi.encodePacked(".", _networkDomain));
  }

  /**
   * @dev Set whether to use the whitelist for domain approval
   * @param _useWhitelist True to enable whitelist, false to allow all valid domains
   */
  function setUseWhitelist(bool _useWhitelist) external onlyOwner {
    useWhitelist = _useWhitelist;
  }

  /**
   * @dev Add a domain to the approved whitelist
   * @param _domain The ENS domain to approve
   */
  function approveDomain(string calldata _domain) external onlyOwner {
    require(
      hasSuffix(_domain, requiredDomainSuffix),
      "Domain must be a subdomain of the network domain"
    );
    approvedDomains[_domain] = true;
    emit DomainApproved(_domain);
  }

  /**
   * @dev Remove a domain from the approved whitelist
   * @param _domain The ENS domain to remove
   */
  function removeDomain(string calldata _domain) external onlyOwner {
    approvedDomains[_domain] = false;
    emit DomainRemoved(_domain);
  }

  /**
   * @dev Check if an app is registered on the network using its domain
   * @param _domain The app's ENS domain
   * @return True if app is registered
   */
  function isAppRegistered(
    string calldata _domain
  ) external view returns (bool) {
    return registeredApps[_domain].isRegistered;
  }

  /**
   * @dev Generate a challenge for an app to sign
   * @param _domain The ENS domain of the app
   * @return A unique challenge string
   */
  function getChallenge(
    string calldata _domain
  ) external view returns (string memory) {
    // Create a unique challenge based on domain and timestamp
    return
      string(
        abi.encodePacked(
          "Prove ownership of ",
          _domain,
          " at timestamp ",
          uint2str(block.timestamp)
        )
      );
  }

  /**
   * @dev Verify domain ownership and register app
   * @param _domain The ENS domain of the app
   * @param _challenge The challenge that was signed
   * @param _signature The signature of the challenge
   * @return Success status
   */
  function verifyAndRegister(
    string calldata _domain,
    string calldata _challenge,
    bytes calldata _signature
  ) external returns (bool) {
    // Check domain suffix
    require(
      hasSuffix(_domain, requiredDomainSuffix),
      "Domain must be a subdomain of the network domain"
    );

    // Check whitelist if enabled
    if (useWhitelist) {
      require(approvedDomains[_domain], "Domain not in approved list");
    }

    // Prevent replay attacks
    require(
      !registeredApps[_domain].usedChallenges[_challenge],
      "Challenge already used"
    );

    // Get the ENS node for the domain
    bytes32 node = _namehash(_domain);

    // Verify caller owns the domain
    require(
      ensRegistry.owner(node) == msg.sender,
      "Caller is not domain owner"
    );

    // Verify signature of challenge
    bytes32 messageHash = keccak256(abi.encodePacked(_challenge));
    bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(messageHash);
    address signer = ECDSA.recover(ethSignedMessageHash, _signature);
    require(signer == msg.sender, "Invalid signature");

    // Mark challenge as used
    registeredApps[_domain].usedChallenges[_challenge] = true;

    // Register or update the app
    if (registeredApps[_domain].isRegistered) {} else {
      string[] memory defaultPermissions = new string[](1);
      defaultPermissions[0] = "basic_access";

      registeredApps[_domain].isRegistered = true;
      registeredApps[_domain].permissions = defaultPermissions;
    }

    // Generate new access token and set expiration
    string memory accessToken = generateAccessToken(_domain);
    uint256 expiration = block.timestamp + defaultTokenValidity;

    registeredApps[_domain].accessToken = accessToken;
    registeredApps[_domain].tokenExpiration = expiration;

    emit AppAuthorized(_domain, _domain, accessToken, expiration);
    return true;
  }

  /**
   * @dev Check an app's access status using its domain
   * @param _domain The app's ENS domain
   * @param _accessToken The access token to validate
   * @return hasAccess Whether the app has valid access
   * @return expiration When the access token expires
   * @return permissions List of permissions granted
   * @return reason Reason if access is denied
   */
  function checkAppAccess(
    string calldata _domain,
    string calldata _accessToken
  )
    external
    view
    returns (
      bool hasAccess,
      uint256 expiration,
      string[] memory permissions,
      string memory reason
    )
  {
    // Check if app is registered
    if (!registeredApps[_domain].isRegistered) {
      return (false, 0, new string[](0), "App not registered");
    }

    // Validate the access token
    if (
      keccak256(bytes(registeredApps[_domain].accessToken)) !=
      keccak256(bytes(_accessToken))
    ) {
      return (false, 0, new string[](0), "Invalid access token");
    }

    // Check if token is expired
    if (block.timestamp > registeredApps[_domain].tokenExpiration) {
      return (false, 0, new string[](0), "Token expired");
    }

    // Return successful access info
    return (
      true,
      registeredApps[_domain].tokenExpiration,
      registeredApps[_domain].permissions,
      ""
    );
  }

  /**
   * @dev Refresh an access token before it expires
   * @param _domain The app's ENS domain
   * @param _currentToken The current access token
   * @return Success status
   */
  function refreshToken(
    string calldata _domain,
    string calldata _currentToken
  ) external returns (bool) {
    // Check if app is registered
    require(registeredApps[_domain].isRegistered, "App not registered");

    // Validate current token
    require(
      keccak256(bytes(registeredApps[_domain].accessToken)) ==
        keccak256(bytes(_currentToken)),
      "Invalid current token"
    );

    // Generate a new token
    string memory newToken = generateAccessToken(_domain);
    uint256 newExpiration = block.timestamp + defaultTokenValidity;

    registeredApps[_domain].accessToken = newToken;
    registeredApps[_domain].tokenExpiration = newExpiration;

    emit TokenRefreshed(_domain, newToken, newExpiration);
    return true;
  }

  /**
   * @dev Generate a new access token
   * @param _domain The app's ENS domain
   * @return A unique access token
   */
  function generateAccessToken(
    string memory _domain
  ) internal view returns (string memory) {
    return
      string(
        abi.encodePacked(
          "tk_",
          uint2str(
            uint256(
              keccak256(
                abi.encodePacked(_domain, block.timestamp, block.prevrandao)
              )
            ) % 10000000000
          ),
          "_",
          uint2str(block.timestamp)
        )
      );
  }

  /**
   * @dev Convert uint to string
   * @param _i The uint to convert
   * @return The string representation
   */
  function uint2str(uint256 _i) internal pure returns (string memory) {
    if (_i == 0) {
      return "0";
    }

    uint256 j = _i;
    uint256 length;

    while (j != 0) {
      length++;
      j /= 10;
    }

    bytes memory bstr = new bytes(length);
    uint256 k = length;

    while (_i != 0) {
      k = k - 1;
      uint8 temp = uint8(48 + (_i % 10));
      bytes1 b1 = bytes1(temp);
      bstr[k] = b1;
      _i /= 10;
    }

    return string(bstr);
  }

  /**
   * @dev Check if a string has a specific suffix
   * @param _str The string to check
   * @param _suffix The suffix to verify
   * @return True if the string ends with the suffix
   */
  function hasSuffix(
    string memory _str,
    string memory _suffix
  ) internal pure returns (bool) {
    bytes memory strBytes = bytes(_str);
    bytes memory suffixBytes = bytes(_suffix);

    if (strBytes.length < suffixBytes.length) {
      return false;
    }

    for (uint i = 0; i < suffixBytes.length; i++) {
      if (
        strBytes[strBytes.length - suffixBytes.length + i] != suffixBytes[i]
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * @dev Implementation of ENS namehash algorithm
   * @param _name The ENS domain name
   * @return The computed namehash
   */
  function _namehash(string memory _name) internal pure returns (bytes32) {
    bytes32 node = bytes32(0);
    string[] memory parts = _splitName(_name);

    for (int256 i = int256(parts.length - 1); i >= 0; i--) {
      node = keccak256(
        abi.encodePacked(node, keccak256(abi.encodePacked(parts[uint256(i)])))
      );
    }

    return node;
  }

  function _splitName(
    string memory _name
  ) internal pure returns (string[] memory) {
    bytes memory nameBytes = bytes(_name);
    uint256 count = 1;

    // Count the number of dots to determine array size
    for (uint256 i = 0; i < nameBytes.length; i++) {
      if (nameBytes[i] == ".") {
        count++;
      }
    }

    string[] memory parts = new string[](count);
    uint256 currentIndex = 0;
    uint256 partStart = 0;

    for (uint256 i = 0; i < nameBytes.length; i++) {
      if (nameBytes[i] == "." || i == nameBytes.length - 1) {
        if (i == nameBytes.length - 1) {
          i++;
        }

        bytes memory part = new bytes(i - partStart);
        for (uint256 j = partStart; j < i; j++) {
          part[j - partStart] = nameBytes[j];
        }

        parts[currentIndex] = string(part);
        currentIndex++;
        partStart = i + 1;
      }
    }

    return parts;
  }
}

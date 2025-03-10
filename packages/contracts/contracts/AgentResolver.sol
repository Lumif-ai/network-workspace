// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/AddrResolver.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/DNSResolver.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/TextResolver.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/NameResolver.sol";

contract AgentResolver is
  AddrResolver,
  DNSResolver,
  TextResolver,
  NameResolver
{
  mapping(bytes32 => mapping(string => string)) texts;
  mapping(bytes32 => mapping(uint256 => bytes)) public records;

  function supportsInterface(
    bytes4 interfaceId
  )
    public
    pure
    override(AddrResolver, DNSResolver, NameResolver, TextResolver)
    returns (bool)
  {
    return
      interfaceId == type(IAddrResolver).interfaceId ||
      interfaceId == type(IDNSRecordResolver).interfaceId ||
      interfaceId == type(ITextResolver).interfaceId ||
      interfaceId == type(INameResolver).interfaceId;
  }

  function isAuthorised(
    bytes32 node
  ) internal view virtual override returns (bool) {
    return true;
  }
}

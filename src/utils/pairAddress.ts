import { ethers } from "ethers";
import { isLessThan } from "./orderTokens";

// Calculate the Sushiswap pool contract address for two given tokens
export function getPairAddress(token0: string, token1: string): string {

  // sort tokens so token0 < token1 always holds true
  if (!isLessThan(token0, token1)) {
    const tmp = token0;
    token0 = token1;
    token1 = tmp;
  }

  const pairCodeHash = "0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303";
  const factory = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac";

  const pairAddress = ethers.utils.getCreate2Address(
    factory,
    ethers.utils.keccak256(ethers.utils.solidityPack(['address', 'address'], [token0, token1])),
    pairCodeHash
  );

  return pairAddress;

}
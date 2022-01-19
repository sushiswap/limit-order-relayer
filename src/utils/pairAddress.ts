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

  const pairCodeHash = process.env.PAIR_CODE_HASH;
  const factory = process.env.FACTORY_ADDRESS;

  const pairAddress = ethers.utils.getCreate2Address(
    factory,
    ethers.utils.keccak256(ethers.utils.solidityPack(['address', 'address'], [token0, token1])),
    pairCodeHash
  );

  return pairAddress;

}
import { ethers } from 'ethers';

// token0 < token1 address comparison
export function isLessThan(token0: string, token1: string) {
  return ethers.BigNumber.from(token0).lt(ethers.BigNumber.from(token1));
}
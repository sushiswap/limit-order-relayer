import { ChainId, WNATIVE_ADDRESS } from "@sushiswap/core-sdk";

export function getWeth(chainId: ChainId) {

  return WNATIVE_ADDRESS[chainId];

}
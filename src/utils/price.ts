import { BigNumber } from "@ethersproject/bignumber"
import { PRICE_MULTIPLIER } from "../pairs/pairUpdates";

export function getOrderPrice(amountIn: BigNumber, amountOut: BigNumber) {
  return amountOut.mul(PRICE_MULTIPLIER).mul("1000").div("997").div(amountIn);
}

export function getOrderPriceString(amountIn: string, amountOut: string) {
  return getOrderPrice(BigNumber.from(amountIn), BigNumber.from(amountOut)).toString();
}

// user must get output tokens by at least this rate
export function getMinRate(amountIn: BigNumber | string, amountOut: BigNumber | string) {
  return BigNumber.from(amountOut).mul(PRICE_MULTIPLIER).div(amountIn);
}
import { BigNumber } from "@ethersproject/bignumber";
import { ILimitOrder } from "../models/models";
import { PriceUpdate } from "../price-updates/pair-updates";

// calculate if order is profitable enough
export async function executableOrders(priceUpdate: PriceUpdate, orders: ILimitOrder[]): Promise<ILimitOrder[]> {

  let profit = 0;

  orders.forEach(order => {

  });

  return orders;
}

function estimateOutput(token0Amount: BigNumber, token1Amount: BigNumber, token0In: BigNumber, token1In: BigNumber): BigNumber {
  return token0In;
}
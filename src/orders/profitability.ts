import { ILimitOrder } from "../models/models";
import { PriceUpdate } from "../price-updates/pair-updates";

// calculate if order is profitable enough
export async function executableOrders(priceUpdate: PriceUpdate, orders: ILimitOrder[]): Promise<ILimitOrder[]> {
  // TODO
  return orders;
}
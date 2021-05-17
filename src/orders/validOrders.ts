import { ILimitOrderData } from "limitorderv2-sdk";
import { Database } from "../database/database";
import { ILimitOrder } from "../models/models";

// Checks if the order has already been filled or if we already send a tx for filling the order
export async function validOrders(orders: ILimitOrder[]): Promise<ILimitOrder[]> {

  const database = Database.Instance;

  const filledOrders = [];
  const partiallyFilledOrders = [];
  const validOrders = [];

  orders.forEach(order => {
    // get order status
    // filledOrders.push()
    // partiallyFilledOrders.push()
    // check that we have not already executed the order
    // validOrders.push()
  })

  await database.updateLimitOrders(filledOrders);
  await database.deleteLimitOrders(partiallyFilledOrders);

  return validOrders;
}

// validate amounts are > 0, chainId is correct etc..
export function validLimitOrderData(order: ILimitOrderData): boolean {
  // TODO
  return true;
}
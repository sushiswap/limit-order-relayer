import { ILimitOrderData } from "limitorderv2-sdk";
import { Database } from "../database/database";
import { ILimitOrder } from "../models/models";

// This is called just before we try to execute orders
// Check if the order is (still) valid
// & update the order status in the database ** (move this to another function potentially)
export async function validOrders(orders: ILimitOrder[]): Promise<ILimitOrder[]> {

  const database = Database.Instance;

  const filledOrders = [];
  const partiallyFilledOrders = [];
  const validOrders = [];

  orders.forEach(order => {
    // TODO

    // simulate the transaction

    // get order status:
    // check if the user has enough balance
    // filledOrders.push()
    // partiallyFilledOrders.push()
    // check that we have not already executed the order
    // validOrders.push()
  });

  await database.updateLimitOrders(filledOrders); // order has been partially filled
  await database.deleteLimitOrders(partiallyFilledOrders); // order filled or expired

  return validOrders;
}

// This is called after we receive the order from the user
// validate amounts are > 0, check the signature
export function validLimitOrderData(order: ILimitOrderData): boolean {
  // TODO
  return true;
}
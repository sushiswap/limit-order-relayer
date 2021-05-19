import { ILimitOrderData, LimitOrder } from "limitorderv2-sdk";
import { Database } from "../database/database";
import { ILimitOrder } from "../models/models";
import { utils } from 'ethers';

// This is called just before we try to execute orders
// Check if the order is (still) valid
// & update the order status in the database ** (move this to another function potentially)
export async function validOrders(orders: ILimitOrder[]): Promise<ILimitOrder[]> {

  const database = Database.Instance;

  const filledOrders = [];
  const validOrders = [];

  orders.forEach(order => {
    // TODO
    // get order status...
    // check if the user has enough balance
    // check if the order isn't expired
    // check if the order isn't already filled
    // check that we have not already executed the order
  });

  await database.deleteLimitOrders(filledOrders); // delete the order only if it is expired / filled

  return validOrders;
}

// This is called after we receive the order from the user
/*
  Checks: Validate Signature, Validate Amounts, Validate Expiry
*/
export function validLimitOrderData(order: ILimitOrderData): boolean {
  let limitOrder = LimitOrder.getLimitOrder(order);
  let isOrderValid = checkSignature(limitOrder) || checkAmounts(limitOrder) || checkExpiry(limitOrder);
  return isOrderValid;
}

function checkSignature(limitOrder: LimitOrder): boolean {
  let typedData = limitOrder.getTypedData(limitOrder.chainId);
  
  let v = limitOrder.v;
  let r = limitOrder.r;
  let s = limitOrder.s;

  let recoveredAddress = utils.verifyTypedData(
    typedData.domain,
    {
      LimitOrder: typedData.types.LimitOrder
    },
    typedData.message,
    { v , r, s }
  )

  if(recoveredAddress != limitOrder.maker) return false;
  return true;
}

function checkAmounts(limitOrder: LimitOrder): boolean {
  if(Number(limitOrder.amountInRaw) <= 0 && Number(limitOrder.amountOutRaw) <= 0) return false;
  return true;
}

function checkExpiry(limitOrder: LimitOrder): boolean {
  if(Number(limitOrder.endTime) < Math.floor(Date.now() / 1000)) return false;
  return true;
}
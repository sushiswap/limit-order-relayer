import { ILimitOrderData, LimitOrder } from "limitorderv2-sdk";
import { Database } from "../database/database";
import { ILimitOrder } from "../models/models";
import { utils, Contract, providers } from 'ethers';
import stopLimitOrderABI from '../abis/stopLimitOrder';

// This is called just before we try to execute orders
// Check if the order is (still) valid
// & update the order status in the database ** (move this to another function potentially)
export async function validOrders(orders: ILimitOrder[]): Promise<ILimitOrder[]> {

  const database = Database.Instance;

  const filledOrders = [];
  const validOrders = [];

  const provider = new providers.WebSocketProvider(process.env.MAINNET_WEBSOCKET_JSON_RPC);

  // Add this to your env later
  let stopLimitOrderContract = new Contract("0xce9365dB1C99897f04B3923C03ba9a5f80E8DB87", stopLimitOrderABI, provider);

  orders.forEach(async (order) => {
    // TODO
    let limitOrder = LimitOrder.getLimitOrder(order.order)
    let isValidOrder = await (isOrderFilled(limitOrder, stopLimitOrderContract) || isOrderCancel(limitOrder, stopLimitOrderContract) || checkExpiry(limitOrder));
    if(isValidOrder) validOrders.push(order);
    else filledOrders.push(order);

    // get order status...
    // check if the user has enough balance
    // check if the order isn't expired
    // check if the order isn't already filled
    // check that we have not already executed the order
  });

  await database.deleteLimitOrders(filledOrders); // delete the order only if it is expired / filled

  return validOrders;
}

async function isOrderFilled(limitOrder: LimitOrder, stopLimitOrderContract: Contract): bool {
  let digest = limitOrder.getTypeHash(limitOrder.chainId);
  let orderStatus = await stopLimitOrderContract.cancelledOrder(limitOrder.maker, digest);
  if(orderStatus) return false;
  return true;
}

async function isOrderCancel(limitOrder: LimitOrder, stopLimitOrderContract: Contract): bool {
  let digest = limitOrder.getTypeHash(limitOrder.chainId);
  let orderStatus = await stopLimitOrderContract.orderStatus(digest);
  if(Number(orderStatus) == Number(limitOrder.amountOutRaw)) return false;
  return true;
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
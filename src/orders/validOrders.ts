import { getVerifyingContract, ILimitOrderData, LimitOrder } from "limitorderv2-sdk";
import { Database } from "../database/database";
import { ILimitOrder, IWatchPair } from "../models/models";
import { utils, Contract, providers, BigNumber } from 'ethers';
import stopLimitOrderABI from '../abis/stopLimitOrder';
import { useWss } from "../price-updates/pair-updates";
import { isExportAssignment } from "typescript";

// This is called just before we try to execute orders
// Check if the order is (still) valid
// & update the order status in the database ** (move this to another function potentially)
export async function validOrders(orders: ILimitOrder[], database): Promise<ILimitOrder[]> {

  const invalidOrders = [];
  const validOrders = [];

  const provider = useWss() ?
    new providers.WebSocketProvider(process.env.WEBSOCKET_JSON_RPC) :
    new providers.JsonRpcProvider(process.env.HTTP_JSON_RPC);

  // Add this to your env later
  let stopLimitOrderContract = new Contract(getVerifyingContract(+process.env.CHAINID), stopLimitOrderABI, provider);


  await Promise.all(orders.map(async (order) => {

    console.log(order);

    const limitOrder = LimitOrder.getLimitOrder(order.order);

    const filled = await isFilled(limitOrder, stopLimitOrderContract);
    const canceled = await isCanceled(limitOrder, stopLimitOrderContract);
    const expired = isExpired(limitOrder);

    if (filled || canceled || expired) {
      invalidOrders.push(order);
    } else {
      validOrders.push(order);
    }

  }));

  // todo retink deletion.. There should probably be a seperate service for this
  // await database.deleteLimitOrders(invalidOrders); // delete the order only if it is expired / filled

  return validOrders;
}

export async function isFilled(limitOrder: LimitOrder, stopLimitOrderContract: Contract): Promise<boolean> {

  const orderStatus = await stopLimitOrderContract.orderStatus(limitOrder.getTypeHash());
  return (orderStatus.toString() === limitOrder.amountOutRaw);

}

export async function isCanceled(limitOrder: LimitOrder, stopLimitOrderContract: Contract): Promise<boolean> {

  return stopLimitOrderContract.cancelledOrder(limitOrder.maker, limitOrder.getTypeHash());

}

export function isExpired(limitOrder: LimitOrder): boolean {
  return (Number(limitOrder.endTime) < Math.floor(Date.now() / 1000));
}

// This is called after we receive the order from the user
// todo don't store orders that aren't present in the watch pairs array
/*
  Checks: Validate Signature, Validate Amounts, Validate Expiry
*/
export function validLimitOrderData(order: ILimitOrderData, watchPairs: IWatchPair[]): boolean {

  let limitOrder;

  try {
    limitOrder = LimitOrder.getLimitOrder(order);
  } catch (error) {
    console.error("Could not parse order ", error);
    return false;
  }

  const correctChain = order.chainId === +process.env.CHAINID;
  const validSig = checkSignature(limitOrder);
  const notExpired = !isExpired(limitOrder);

  return correctChain && validSig && notExpired;
}

function checkSignature(limitOrder: LimitOrder): boolean {
  let typedData = limitOrder.getTypedData();
  
  let v = limitOrder.v;
  let r = limitOrder.r;
  let s = limitOrder.s;

  let recoveredAddress = utils.verifyTypedData(
    typedData.domain,
    { LimitOrder: typedData.types.LimitOrder },
    typedData.message,
    { v , r, s }
  )

  if(recoveredAddress != limitOrder.maker) return false;
  return true;
}

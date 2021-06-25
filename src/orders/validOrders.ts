import { getBentoContract, getVerifyingContract, ILimitOrderData, LimitOrder } from "limitorderv2-sdk";
import { ILimitOrder, IWatchPair } from "../models/models";
import { utils, Contract, BigNumber } from 'ethers';
import stopLimitOrderABI from '../abis/stopLimitOrder';
import bentoBox from "../abis/bentoBox";
import { MyProvider } from "../utils/myProvider";
import { Database } from "../database/database";
import { MyLogger } from "../utils/myLogger";

/**
 *
 * @param orders
 * @param fetchUserBalance
 * @returns Array of valid orders
 * This is called just before we try to execute orders
 * Check if the order is (still) valid & update the order status in the database
 */
export async function refreshOrderStatus(orders: ILimitOrder[], fetchUserBalance = true): Promise<ILimitOrder[]> {

  if (orders.length === 0) return [];

  const validOrders = [];
  const invalidOrders = [];

  const provider = MyProvider.Instance.provider;

  const stopLimitOrderContract = new Contract(getVerifyingContract(+process.env.CHAINID), stopLimitOrderABI, provider);
  const bentoBoxContract = new Contract(getBentoContract(+process.env.CHAINID), bentoBox, provider);

  await Promise.all(orders.map(async (order) => {

    const limitOrder = LimitOrder.getLimitOrder(order.order);

    let filled, filledAmount, canceled, balance;

    try {

      [filled, filledAmount] = await isFilled(limitOrder, stopLimitOrderContract);
      canceled = await isCanceled(limitOrder, stopLimitOrderContract);

      if (fetchUserBalance) {
        // Use the current user balance. This is problematic as the user may have another order that we will execute that will use up this balance
        balance = await getUserBalance(limitOrder.tokenInAddress, limitOrder.maker, bentoBoxContract);
        order.userBalance = balance.toString();
      }

    } catch (error) {

      return MyLogger.log(`Couldn't refresh order status ${error.toString().substring(0, 100)} ...`)

    }

    order.filledAmount = filledAmount.toString();

    const expired = isExpired(limitOrder);
    const live = isLive(limitOrder);

    if (!filled && !canceled && !expired && live) {
      validOrders.push(order);
    } else {
      invalidOrders.push(order);
    }

  }));

  if (invalidOrders.length > 0) Database.Instance.invalidateLimitOrders(invalidOrders).then(info => MyLogger.log(`Invalidated ${invalidOrders.length} orders`));

  return validOrders;

}


export async function getUserBalance(tokenIn, maker, bentoBoxContract: Contract) {
  return bentoBoxContract.balanceOf(tokenIn, maker);
}

export async function isFilled(limitOrder: LimitOrder, stopLimitOrderContract: Contract): Promise<[boolean, BigNumber]> {

  const orderStatus = await stopLimitOrderContract.orderStatus(limitOrder.getTypeHash());

  return [orderStatus.toString() === limitOrder.amountInRaw, BigNumber.from(orderStatus)];

}

export async function isCanceled(limitOrder: LimitOrder, stopLimitOrderContract: Contract): Promise<boolean> {

  return stopLimitOrderContract.cancelledOrder(limitOrder.maker, limitOrder.getTypeHash());

}

/**
 * @param order
 * @param watchPairs array of pairs we execute limit orders on, an order isn't considered correct if its not covered by the watch paris array
 * @returns
 * @note This is called after we receive the order from the user
 * @note Checks: Validate Signature, Validate Amounts, Validate Expiry
 */
export function validateLimitOrderData(order: ILimitOrderData, watchPairs: IWatchPair[]): boolean {

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

  const typedData = limitOrder.getTypedData();

  const { v, r, s } = limitOrder;

  const recoveredAddress = utils.verifyTypedData(
    typedData.domain,
    { LimitOrder: typedData.types.LimitOrder },
    typedData.message,
    { v , r, s }
  );

  return recoveredAddress === limitOrder.maker;
}

export function isExpired(limitOrder: LimitOrder): boolean {
  return (Number(limitOrder.endTime) < Math.floor(Date.now() / 1000));
}

export function isLive(limitOrder: LimitOrder): boolean {
  return (Number(limitOrder.startTime) < Math.floor(Date.now() / 1000));
}
import { ILimitOrderData, LimitOrder } from "limitorderv2-sdk";
import { ILimitOrder, IWatchPair } from "../models/models";
import { utils, Contract, BigNumber } from 'ethers';
import { MyProvider } from "../utils/myProvider";
import { Database } from "../database/database";
import { MyLogger } from "../utils/myLogger";
import HELPER from "../abis/helper";

/**
 *
 * @param orders
 * @param fetchUserBalance
 * @returns Array of valid orders
 * This is called just before we try to execute orders
 * Check if the order is (still) valid & update the order status in the database
 */
export async function refreshOrderStatus(limitOrders: ILimitOrder[]): Promise<ILimitOrder[]> {

  const orderStatuses = await getOrderStatus(limitOrders, false);

  const validOrders = orderStatuses.filter(({ status }) => status === OrderStatus.VALID).map(({ limitOrder }) => limitOrder);

  const invalidOrders = orderStatuses.filter(({ status }) => status === OrderStatus.INVALID).map(({ limitOrder }) => limitOrder);

  if (invalidOrders.length > 0) Database.Instance.invalidateLimitOrders(invalidOrders).then(info => MyLogger.log(`Invalidated ${invalidOrders.length} orders`));

  return validOrders;

}

export async function refreshGroupOrderStatus(pairLimitOrders: ILimitOrder[][][], getStatus = getOrderStatus): Promise<ILimitOrder[][][]> {

  const flattened = [];

  pairLimitOrders.forEach(sellAndBuyOrders => sellAndBuyOrders.forEach(limitOrders => flattened.push(...limitOrders)));

  const orderStatuses = await getStatus(flattened, true);

  const regrouped: { status: OrderStatus, limitOrder: ILimitOrder }[][][] = [];

  let idx = 0;

  pairLimitOrders.forEach((sellAndBuyOrders, i) => sellAndBuyOrders.forEach((limitOrders, j) => limitOrders.forEach((limitOrder, k) => {

    if (!regrouped[i]) regrouped[i] = [[], []]; // expect j < 2 to always be true

    regrouped[i][j][k] = orderStatuses[idx++];

  })));

  return regrouped.map(sellAndBuyOrders => sellAndBuyOrders.map(orders => orders.filter(({ status }) => status === OrderStatus.VALID).map(({ limitOrder }) => limitOrder)));

}

export enum OrderStatus { INVALID, VALID, PENDING };

export async function getOrderStatus(limitOrders: ILimitOrder[], fetchUserBalance: boolean): Promise<{ status: OrderStatus, limitOrder: ILimitOrder }[]> {

  if (limitOrders.length === 0) return [];

  const status: OrderStatus[] = [];

  const provider = MyProvider.Instance.provider;

  const helper = new Contract(process.env.HELPER, HELPER, provider);

  let info: { filledAmount: BigNumber, cancelled: boolean, makersBentoBalance?: BigNumber, approvedMasterContract?: boolean }[];

  if (fetchUserBalance) {

    info = await helper.getOrderUserInfo(
      limitOrders.map(limitOrder => limitOrder.order.maker),
      limitOrders.map(limitOrder => limitOrder.order.tokenIn),
      limitOrders.map(limitOrder => limitOrder.digest)
    );

  } else {

    info = await helper.getOrderInfo(
      limitOrders.map(limitOrder => limitOrder.order.maker),
      limitOrders.map(limitOrder => limitOrder.digest)
    );

  }

  limitOrders.forEach((_limitOrder, i) => {

    const filledAmount = info[i].filledAmount;

    _limitOrder.filledAmount = filledAmount.toString();

    if (fetchUserBalance) _limitOrder.userBalance = info[i].makersBentoBalance.toString();

    const limitOrder = LimitOrder.getLimitOrder(_limitOrder.order);

    const expired = isExpired(limitOrder);
    const live = isLive(limitOrder);
    const canceled = info[i].cancelled;
    const approvedMasterContract = info[i].approvedMasterContract;
    const filled = filledAmount.eq(limitOrder.amountInRaw);



    if (!filled && !canceled && !expired && live && approvedMasterContract) {
      status.push(OrderStatus.VALID);
    } else if (filled || canceled || expired) {
      status.push(OrderStatus.INVALID);
    } else {
      status.push(OrderStatus.PENDING);
    }

  });

  return limitOrders.map((limitOrder, i) => {
    return {
      status: status[i],
      limitOrder
    };
  });

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
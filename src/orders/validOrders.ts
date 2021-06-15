import { getBentoContract, getVerifyingContract, ILimitOrderData, LimitOrder } from "limitorderv2-sdk";
import { ILimitOrder, IWatchPair } from "../models/models";
import { utils, Contract, providers, BigNumber } from 'ethers';
import stopLimitOrderABI from '../abis/stopLimitOrder';
import bentoBox from "../abis/bentoBox";
import { MyProvider } from "../utils/provider";

// This is called just before we try to execute orders
// Check if the order is (still) valid
// & update the order status in the database ** (move this to another function potentially)
export async function refreshOrderStatus(orders: ILimitOrder[], database): Promise<ILimitOrder[]> {

  const validOrders = [];

  const provider = MyProvider.Instance.provider;

  const stopLimitOrderContract = new Contract(getVerifyingContract(+process.env.CHAINID), stopLimitOrderABI, provider);
  const bentoBoxContract = new Contract(getBentoContract(+process.env.CHAINID), bentoBox, provider);

  await Promise.all(orders.map(async (order) => {

    const limitOrder = LimitOrder.getLimitOrder(order.order);

    const { filled, filledAmount } = await isFilled(limitOrder, stopLimitOrderContract);

    order.filledAmount = filledAmount.toString();
    order.userBalance = (await bentoBoxContract.balanceOf(limitOrder.tokenInAddress, limitOrder.maker)).toString();

    const canceled = await isCanceled(limitOrder, stopLimitOrderContract);
    const expired = isExpired(limitOrder);
    const live = isLive(limitOrder);

    if (!filled && !canceled && !expired && live) {
      validOrders.push(order);
    }

  }));

  return validOrders;
}

export async function isFilled(limitOrder: LimitOrder, stopLimitOrderContract: Contract): Promise<{ filled: boolean, filledAmount: BigNumber }> {

  const orderStatus = await stopLimitOrderContract.orderStatus(limitOrder.getTypeHash());

  return { filled: orderStatus.toString() === limitOrder.amountOutRaw, filledAmount: BigNumber.from(orderStatus) }

}

export async function isCanceled(limitOrder: LimitOrder, stopLimitOrderContract: Contract): Promise<boolean> {

  return stopLimitOrderContract.cancelledOrder(limitOrder.maker, limitOrder.getTypeHash());

}

export function isExpired(limitOrder: LimitOrder): boolean {
  return (Number(limitOrder.endTime) < Math.floor(Date.now() / 1000));
}

export function isLive(limitOrder: LimitOrder): boolean {
  return (Number(limitOrder.startTime) < Math.floor(Date.now() / 1000));
}

// This is called after we receive the order from the user
// todo don't store orders that aren't present in the watch pairs array
/*
  Checks: Validate Signature, Validate Amounts, Validate Expiry
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

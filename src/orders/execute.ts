import { ChainId } from "@sushiswap/sdk";
import { BigNumber, ethers, providers } from "ethers";
import { FillLimitOrder, getDefaultReceiver, LimitOrder } from "limitorderv2-sdk";
import { IExecutedOrder } from "../models/models";
import { ExecutableOrder, getGasPrice } from "./profitability";

// TODO cache to prevent republishing of recent orders ... const executedOrders: { [digest: string]: Date } = {};

export async function executeOrders(ordersData: ExecutableOrder[]): Promise<IExecutedOrder[]> {

  const executed: IExecutedOrder[] = [];

  await Promise.all(ordersData.map(async executableOrder => {

    const order = executableOrder.limitOrderData.order;

    const minOut = executableOrder.outAmount.sub(1); // 0 slippage

    console.log('desired min out', minOut.toString()); // TODO

    const fillOrder = new FillLimitOrder(
      LimitOrder.getLimitOrder(order),
      [order.tokenIn, order.tokenOut],
      minOut,
      executableOrder.inAmount,
      getDefaultReceiver(ChainId.MATIC),
      process.env.PROFIT_RECEIVER_ADDRESS
    );

    const provider = new providers.JsonRpcProvider(process.env.HTTP_JSON_RPC);

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const gasPrice = await getGasPrice(+process.env.CHAINID);

    if (!gasPrice) {
      console.log('Could not fetch gas prices');
      return;
    }

    const alreadyExecuted = OrderCache.Instance.alreadyExecuted(executableOrder.limitOrderData.digest);

    if (!alreadyExecuted) {

      const fillStatus = await fillOrder.fillOrder(wallet, { forceExecution: false, gasPrice: BigNumber.from("1000000000") as any, open: false });

      if (fillStatus.executed) {

        executed.push({
          order: executableOrder.limitOrderData.order,
          digest: executableOrder.limitOrderData.digest,
          fillAmount: executableOrder.inAmount.toString(),
          txHash: fillStatus.transactionHash
        });

        console.log(fillStatus.transactionHash);

      } else {

        OrderCache.Instance.remove(executableOrder.limitOrderData.digest);
        console.log('Gas estimation failed');

      }

    }

  }));

  return executed;
}

export class OrderCache {

  private executedOrders: Array<{ timestamp: number, digest: string }> = [];

  private timeBuffer = 1000 * 180; // 3 min

  private static _instance: OrderCache;

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  protected constructor() { };

  alreadyExecuted(digest: string) {

    this.executedOrders = this.executedOrders.filter(o => o.timestamp + this.timeBuffer > new Date().getTime());

    const alreadyExecuted = this.executedOrders.some(o => o.digest === digest);

    if (!alreadyExecuted) {

      this.executedOrders.push({
        timestamp: new Date().getTime(),
        digest
      });

    }

    return alreadyExecuted;

  }

  remove(digest: string) {

    this.executedOrders = this.executedOrders.filter(o => o.digest !== digest);

  }

}
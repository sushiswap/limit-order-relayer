import { ChainId } from "@sushiswap/sdk";
import { BigNumber, ethers, providers } from "ethers";
import { FillLimitOrder, getAdvancedReceiver, getDefaultReceiver, LimitOrder } from "limitorderv2-sdk";
import { IExecutedOrder } from "../models/models";
import { ExecutableOrder, getGasPrice } from "./profitability";
import DEFAULT_TOKEN_LIST from '@sushiswap/default-token-list';
import { _desiredProfitToken } from '../limitOrderConfig/pairs';

// TODO cache to prevent republishing of recent orders ... const executedOrders: { [digest: string]: Date } = {};

export async function executeOrders(ordersData: ExecutableOrder[]): Promise<IExecutedOrder[]> {

  const executed: IExecutedOrder[] = [];

  await Promise.all(ordersData.map(async executableOrder => {

    const order = executableOrder.limitOrderData.order;

    const keepTokenIn = ExecuteHelper.Instance.keepTokenIn(executableOrder.limitOrderData.order.tokenIn, executableOrder.limitOrderData.order.tokenOut);

    let amountExternal: BigNumber;

    if (keepTokenIn) {
      amountExternal = executableOrder.inAmount; // max slippage ... TODO
    } else {
      amountExternal = executableOrder.outAmount.sub(1); // 0 slippage
    }

    console.log(`keep token in: ${keepTokenIn}, amountExternal: ${amountExternal.toString()}`);

    const fillOrder = new FillLimitOrder(
      LimitOrder.getLimitOrder(order),
      [order.tokenIn, order.tokenOut],
      amountExternal,
      executableOrder.inAmount,
      getAdvancedReceiver(ChainId.MATIC),
      process.env.PROFIT_RECEIVER_ADDRESS,
      keepTokenIn
    );

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, new providers.JsonRpcProvider(process.env.HTTP_JSON_RPC));

    const gasPrice = await getGasPrice(+process.env.CHAINID);

    if (!gasPrice) return console.log('Could not fetch gas prices');

    const alreadyExecuted = ExecuteHelper.Instance.alreadyExecuted(executableOrder.limitOrderData.digest);

    if (!alreadyExecuted) {

      const fillStatus = await fillOrder.fillOrder(wallet, { forceExecution: true, gasPrice: BigNumber.from("1000000000") as any, open: false });

      if (fillStatus.executed) {

        executed.push({
          order: executableOrder.limitOrderData.order,
          digest: executableOrder.limitOrderData.digest,
          fillAmount: executableOrder.inAmount.toString(),
          txHash: fillStatus.transactionHash
        });

        console.log(fillStatus.transactionHash);

      } else {

        ExecuteHelper.Instance.remove(executableOrder.limitOrderData.digest);
        console.log('Gas estimation failed');

      }

    }

  }));

  return executed;
}

export class ExecuteHelper {

  private executedOrders: Array<{ timestamp: number, digest: string }> = [];

  private timeBuffer = 1000 * 180; // 3 min

  public readonly profitTokens: string[];

  private static _instance: ExecuteHelper;

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  protected constructor() {

    const tokens = DEFAULT_TOKEN_LIST.tokens.filter(token => token.chainId === +process.env.CHAINID);
    this.profitTokens = _desiredProfitToken.map(tokenSymbol => tokens.find(token => token.symbol === tokenSymbol).address).reverse();
    if (this.profitTokens.indexOf(undefined) !== -1) console.log(`Error! Couldn't find profit token`);

  };

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

  // given two token addressed figure out which one we want to keep profit in
  keepTokenIn(tokenIn: string, tokenOut: string) {
    return this.profitTokens.indexOf(tokenIn) > this.profitTokens.indexOf(tokenOut);
  }

}
import { BigNumber } from "ethers";
import { FillLimitOrder, getAdvancedReceiver, LimitOrder } from "limitorderv2-sdk";
import { IExecutedOrder } from "../models/models";
import { ExecutableOrder } from "./profitability";
import DEFAULT_TOKEN_LIST from '@sushiswap/default-token-list';
import { getDesiredProfitToken } from '../relayer-config/pairs';
import { MyProvider } from "../utils/myProvider";
import { MyLogger } from "../utils/myLogger";
import { safeAwait } from "../utils/myAwait";
import { ChainId } from "@sushiswap/sdk";

export async function executeOrders(ordersData: ExecutableOrder[], gasPrice: BigNumber): Promise<IExecutedOrder[]> {

  const forceExecution = true;

  const executedOrders: IExecutedOrder[] = [];

  await Promise.all(ordersData.map(async executableOrder => {

    const order = executableOrder.limitOrderData.order;

    const keepTokenIn = ExecuteHelper.Instance.keepTokenIn(executableOrder.limitOrderData.order.tokenIn, executableOrder.limitOrderData.order.tokenOut);

    let amountExternal: BigNumber;

    if (keepTokenIn) {
      const inDiff = executableOrder.inAmount.sub(executableOrder.minAmountIn).div(10);
      amountExternal = executableOrder.minAmountIn.add(inDiff); // 10% of profit as slippage
    } else {
      amountExternal = executableOrder.outAmount.sub(executableOrder.outDiff.div(10)); // 10% of profit as slippage
    }

    const fillOrder = new FillLimitOrder(
      LimitOrder.getLimitOrder(order),
      [order.tokenIn, order.tokenOut],
      amountExternal,
      executableOrder.inAmount,
      getAdvancedReceiver(ChainId.MATIC),
      process.env.PROFIT_RECEIVER_ADDRESS,
      keepTokenIn
    );

    const signer = MyProvider.Instance.signer;

    const alreadyExecuted = ExecuteHelper.Instance.alreadyExecuted(executableOrder.limitOrderData.digest);

    if (!alreadyExecuted) {

      const [data, error] = await safeAwait(fillOrder.fillOrder(signer, { debug: true, forceExecution, gasPrice: gasPrice, open: false }));

      if (error) {

        ExecuteHelper.Instance.remove(executableOrder.limitOrderData.digest);
        return MyLogger.log(`Couldn't execute order ${error.toString()} ...`);

      }


      const { executed, transaction } = data;

      if (executed) {

        executedOrders.push({
          order: executableOrder.limitOrderData.order,
          digest: executableOrder.limitOrderData.digest,
          fillAmount: executableOrder.inAmount.toString(),
          txHash: transaction.hash,
          status: -1
        });

        MyLogger.log(`${transaction.hash}, gasPrice: ${parseFloat(gasPrice.div(1e8).toString()) / 10}, nonce: ${transaction.nonce}`);

      } else {

        ExecuteHelper.Instance.remove(executableOrder.limitOrderData.digest);
        MyLogger.log(`Gas estimation failed for: ${executableOrder.limitOrderData.digest}`);

      }

    } else {

      MyLogger.log('Order already executing');

    }

  }));

  return executedOrders;

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

    this.profitTokens = getDesiredProfitToken(+process.env.CHAINID).map(tokenSymbol => tokens.find(token => token.symbol === tokenSymbol).address).reverse();

    if (this.profitTokens.length && this.profitTokens.indexOf(undefined) !== -1) MyLogger.log(`Error! Couldn't find profit token @ index ${this.profitTokens.indexOf(undefined)}`);

  };

  alreadyExecuted(digest: string) {

    this.executedOrders = this.executedOrders.filter(o => o.timestamp + this.timeBuffer > new Date().getTime());

    const alreadyExecuted = this.executedOrders.some(o => o.digest === digest);

    if (!alreadyExecuted) {

      this.executedOrders.push({
        timestamp: new Date().getTime(),
        digest,
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
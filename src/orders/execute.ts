import { ChainId } from "@sushiswap/sdk";
import { BigNumber, ethers, providers } from "ethers";
import { FillLimitOrder, getDefaultReceiver, LimitOrder } from "limitorderv2-sdk";
import { ExecutableOrder } from "./profitability";

// TODO cache to prevent republishing of recent orders ... const executedOrders: { [digest: string]: Date } = {};

export function executeOrders(ordersData: ExecutableOrder[]): Promise<void> {

  ordersData.forEach(async executableOrder => {

    const order = executableOrder.limitOrderData.order;
    const minOut = executableOrder.outAmount.sub(1); // 0 slippage

    const fillOrder = new FillLimitOrder(
      LimitOrder.getLimitOrder(order),
      [order.tokenIn, order.tokenOut],
      BigNumber.from("0"),
      executableOrder.inAmount,
      getDefaultReceiver(ChainId.MATIC),
      process.env.PROFIT_RECEIVER_ADDRESS
    );

    const provider = new providers.JsonRpcProvider(process.env.HTTP_JSON_RPC);

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log(await fillOrder.fillOrder(wallet, { forceExecution: true, gasPrice: BigNumber.from("1000000000") as any, open: false }));

  });

  return;
}

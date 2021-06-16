/* script used to seed the relayers database with orders */

import axios from 'axios';
import { ILimitOrderData, LAMBDA_URL } from 'limitorderv2-sdk';
import dotenv from 'dotenv';
import { Database } from './database';
import { ILimitOrder } from '../models/models';
import { getOrderPriceString } from '../utils/price';
import { refreshOrderStatus } from '../orders/validOrders';

dotenv.config();

export async function copyRemoteOrders() {

  const orderData: ILimitOrderData[] = (await axios(`${LAMBDA_URL}/orders/pending`, {
    method: 'POST',
    data: {
      chainId: process.env.CHAINID
    }
  })).data?.data?.orders;

  if (!Array.isArray(orderData)) throw new Error(`Couldn't fetch orders from remote DB`)

  const database = Database.Instance;

  await database.connectDB();

  const orders: ILimitOrder[] = orderData.map(order => {
    return {
      price: getOrderPriceString(order.amountIn, order.amountOut),
      digest: order.orderTypeHash,
      order
    }
  });

  await database.saveLimitOrders(orders);

  const storedOrders = await database.getAllLimitOrders();

  await refreshOrderStatus(storedOrders, false);

}

copyRemoteOrders().then(() => {
  process.exit();
});
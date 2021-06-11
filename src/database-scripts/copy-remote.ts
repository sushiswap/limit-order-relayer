/* script used to seed the relayers database with orders */

import axios from 'axios';
import { ILimitOrderData, LAMBDA_URL } from 'limitorderv2-sdk';
import dotenv from 'dotenv';
dotenv.config();

export async function copyRemoteOrders() {

  const orders: ILimitOrderData[] = (await axios(`${LAMBDA_URL}/orders/pending`, {
    method: 'POST',
    data: {
      chainId: process.env.CHAINID
    }
  })).data.data;

  // console.log(orders.);


}

copyRemoteOrders();
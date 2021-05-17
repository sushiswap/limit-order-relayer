import { BigNumber } from '@ethersproject/bignumber';
import { ILimitOrderData, LimitOrder } from 'limitorderv2-sdk';
import { Observable, Subject } from 'rxjs';
import { IMessageEvent, w3cwebsocket } from 'websocket';
import { IWatchPair, Side, ILimitOrder } from '../models/models';
import { PRICE_MULTIPLIER } from '../price-updates/pair-updates';
import { isLessThan } from '../utils/orderTokens';
import { validLimitOrderData } from './validOrders';

const socketUrl = 'wss://w4s58dcj10.execute-api.us-east-1.amazonaws.com/dev';

let socket: w3cwebsocket;
let intervalPointer: NodeJS.Timeout;
let onMessageFunction: (IMessageEvent) => void;

function startSocket(url: string, onMessage: (m: IMessageEvent) => void): w3cwebsocket {

  socket = new w3cwebsocket(url);
  socket.onerror = onError;
  socket.onopen = onOpen;
  socket.onclose = onClose;
  socket.onmessage = onMessage;

  onMessageFunction = onMessage;

  return socket;
}

const onError = (e) => console.log('SOCKET ERROR ', e.reason);

const onClose = (m) => console.log('SOCKET CLOSED');

const onOpen = () => console.log('Connected to the Sushi Relayer Service');

const heartbeat = async () => {
  if (socket.readyState !== socket.OPEN) {
    console.log('starting socket again')
    startSocket(socketUrl, onMessageFunction);
  }
}

export function watchLimitOrders(watchPairs: IWatchPair[]): Observable<ILimitOrder> {

  const updates = new Subject<ILimitOrder>();

  socket = startSocket(socketUrl, ({ data }: any) => {

    const order: ILimitOrderData = JSON.parse(data).limitOrder;

    if (!validLimitOrderData(order)) return;

    const digest = LimitOrder.getLimitOrder(order).getDigest();

    let side: Side
    let price: string;

    if (isLessThan(order.tokenIn, order.tokenOut)) {

      price = BigNumber.from(order.amountIn).mul(PRICE_MULTIPLIER).div(BigNumber.from(order.amountOut)).toString();
      side = Side.Sell;

    } else {

      price = BigNumber.from(order.amountOut).mul(PRICE_MULTIPLIER).div(BigNumber.from(order.amountIn)).toString();
      side = Side.Buy;

    }

    clearInterval(intervalPointer);
    intervalPointer = setInterval(heartbeat, 5000);

    updates.next({ price, digest, order, side, filledAmount: "0" });

  });

  return updates;

}

export function stopReceivingOrders() { socket.close() };
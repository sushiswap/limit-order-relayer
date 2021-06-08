import { BigNumber } from '@ethersproject/bignumber';
import { ILimitOrderData, SOCKET_URL, LimitOrder } from 'limitorderv2-sdk';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { IMessageEvent, w3cwebsocket } from 'websocket';
import { IWatchPair, ILimitOrder } from '../models/models';
import { getOrderPrice } from '../utils/price';
import { validateLimitOrderData } from './validOrders';

const socketUrl = SOCKET_URL;

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

const onError = (e) => console.log('SOCKET ERROR ', e);

const onClose = () => console.log('SOCKET CLOSED');

const onOpen = () => {
  clearInterval(intervalPointer);
  intervalPointer = setInterval(heartbeat, 5000);
  console.log('Connected to the Sushi Relayer Service');
};

const heartbeat = async () => {
  if (socket.readyState !== socket.OPEN) {
    startSocket(socketUrl, onMessageFunction);
  }
}

// receive orders from the websocket
function _watchLimitOrders(watchPairs: IWatchPair[]): Observable<ILimitOrderData> {

  const updates = new Subject<ILimitOrderData>();

  socket = startSocket(socketUrl, ({ data }: any) => {

    const order: ILimitOrderData = JSON.parse(data).limitOrder;

    updates.next(order);

  });

  return updates;

}

// parametize for easier testing
export function watchLimitOrders(watchPairs: IWatchPair[], sub = _watchLimitOrders): Observable<ILimitOrder> {
  return sub(watchPairs).pipe(

    filter(order => validateLimitOrderData(order, watchPairs)),

    map((order: ILimitOrderData) => {

      const digest = LimitOrder.getLimitOrder(order).getTypeHash();

      const price = getOrderPrice(BigNumber.from(order.amountIn), BigNumber.from(order.amountOut)).toString();

      return { price, digest, order };

    }));
}

export function stopReceivingOrders() { socket.close() };
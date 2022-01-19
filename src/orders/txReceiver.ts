import { BigNumber } from "@ethersproject/bignumber";
import {
  ILimitOrderData,
  SOCKET_URL,
  LimitOrder,
} from "@sushiswap/limit-order-sdk";
import { Observable, Subject } from "rxjs";
import { filter, map, tap } from "rxjs/operators";
import { IMessageEvent, w3cwebsocket } from "websocket";
import { IWatchPair, ILimitOrder } from "../models/models";
import { MyLogger } from "../utils/myLogger";
import { getOrderPrice } from "../utils/price";
import { validateLimitOrderData } from "./validOrders";

const socketUrl = SOCKET_URL;

let socket: w3cwebsocket;
let intervalPointer: NodeJS.Timeout;
let onMessageFunction: (IMessageEvent) => void;

function startSocket(
  url: string,
  onMessage: (m: IMessageEvent) => void
): w3cwebsocket {
  socket = new w3cwebsocket(url);
  socket.onerror = onError;
  socket.onopen = onOpen;
  socket.onclose = onClose;
  socket.onmessage = onMessage;

  onMessageFunction = onMessage;

  return socket;
}

const onError = (e) => MyLogger.log(`SOCKET ERROR: ${e} `);

const onClose = () => undefined;

const onOpen = () => {
  clearInterval(intervalPointer);
  intervalPointer = setInterval(heartbeat, 3000);
};

const heartbeat = async () => {
  if (socket.readyState !== socket.OPEN) {
    startSocket(socketUrl, onMessageFunction);
  }
};

// receive orders from the websocket
function _watchLimitOrders(
  watchPairs: IWatchPair[]
): Observable<ILimitOrderData> {
  const updates = new Subject<ILimitOrderData>();

  socket = startSocket(socketUrl, ({ data }: any) => {
    const parsedData = JSON.parse(data);

    if ((parsedData.tag = "LIMIT_ORDER_V2")) {
      const order: ILimitOrderData = parsedData.limitOrder;
      updates.next(order);
    }
  });

  return updates;
}

export function watchLimitOrders(
  watchPairs: IWatchPair[],
  watcher = _watchLimitOrders
): Observable<ILimitOrder> {
  return watcher(watchPairs).pipe(
    filter((order) => validateLimitOrderData(order, watchPairs)),

    map((order: ILimitOrderData) => {
      const digest = LimitOrder.getLimitOrder(order).getTypeHash();

      const price = getOrderPrice(
        BigNumber.from(order.amountIn),
        BigNumber.from(order.amountOut)
      ).toString();

      return { price, digest, order };
    })
  );
}

export function stopReceivingOrders() {
  socket?.close();
}

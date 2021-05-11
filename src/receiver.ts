import { IMessageEvent, w3cwebsocket } from 'websocket';

const socketUrl = 'wss://w4s58dcj10.execute-api.us-east-1.amazonaws.com/dev';

let socket: w3cwebsocket;
let onMessageFunction: (IMessageEvent) => void;

function startSocket(url: string, onMessage: (IMessageEvent) => void): w3cwebsocket {

  socket = new w3cwebsocket(url);
  socket.onerror = onError;
  socket.onopen = onOpen;
  socket.onclose = onClose;
  socket.onmessage = onMessage;

  onMessageFunction = onMessage;

  return socket;
}


const onError = (e) => console.log('ERROR ', e);

const onClose = (m) => console.log('SOCKET CLOSED ', m);

const onOpen = () => {
  console.log('Connected to the Sushi Relayer Service');
  setInterval(heartbeat, 5000);
};

const heartbeat = async () => {
  if (socket.readyState !== socket.OPEN) {
    startSocket(socketUrl, onMessageFunction);
  }
}
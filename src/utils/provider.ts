import { providers, Wallet } from "ethers";

export class MyProvider {

  private _provider: providers.JsonRpcProvider;
  private _socketProvider: providers.WebSocketProvider;
  private _wallet: Wallet;

  private static _instance: MyProvider;

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  protected constructor() {

    this._provider = new providers.JsonRpcProvider(process.env.HTTP_JSON_RPC);

    this._wallet = new Wallet(process.env.PRIVATE_KEY, this._provider);

    if (process.env.WEBSOCKET_JSON_RPC) {

      this._socketProvider = new providers.WebSocketProvider(process.env.WEBSOCKET_JSON_RPC);

    }

  };

  public get provider() {
    return this._provider;
  }

  public get usingSocket() {
    return !!this._socketProvider;
  }

  public get socketProvider() {
    return this._socketProvider;
  }

  public get wallet() {
    return this._wallet;
  }

}
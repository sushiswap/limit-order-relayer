import { NonceManager } from "@ethersproject/experimental";
import { providers, Wallet } from "ethers";

export class MyProvider {

  private _provider: providers.JsonRpcProvider;
  private _socketProvider: providers.WebSocketProvider;
  private _signer: NonceManager;

  private static _instance: MyProvider;

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  protected constructor() {

    this._provider = new providers.JsonRpcProvider(process.env.HTTP_JSON_RPC);

    this._signer = new NonceManager(new Wallet(process.env.PRIVATE_KEY, this._provider)); // TODO we sould reset setTransactionCount every so often 

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

  public get signer() {
    return this._signer;
  }

}
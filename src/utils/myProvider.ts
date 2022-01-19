import { NonceManager } from "@ethersproject/experimental";
import { providers, Wallet } from "ethers";

export class MyProvider {

  // helpers for load balancing
  private toggle = false;
  private lastToggle = new Date();

  private _provider: providers.JsonRpcProvider;
  private _secondaryProvider: providers.JsonRpcProvider;
  private _socketProvider: providers.WebSocketProvider;
  private _signer: NonceManager;

  // the relayer executes its logic every x seconds
  // we will schedule a nonce reset 20 seconds before the next relayer interval
  private relayerInterval: number;
  private nonceResetTime = 0;

  private static _instance: MyProvider;

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  protected constructor() {

    this._provider = new providers.JsonRpcProvider(process.env.HTTP_JSON_RPC);

    this._secondaryProvider = new providers.JsonRpcProvider(process.env.SECONDARY_HTTP_JSON_RPC);

    this._signer = new NonceManager(new Wallet(process.env.PRIVATE_KEY, this._provider));

    if (process.env.WEBSOCKET_JSON_RPC) {

      this._socketProvider = new providers.WebSocketProvider(process.env.WEBSOCKET_JSON_RPC);

    }

    this.relayerInterval = +process.env.INTERVAL_MINUTES * 60 * 1000;

  };

  public get provider() {

    if (this.lastToggle.getTime() < (new Date()).getTime() - 1000 * 60) {
      this.lastToggle = new Date();
      this.toggle = !this.toggle;
    }

    return this.toggle ? this._provider : this._secondaryProvider;

  }

  public get usingSocket() {
    return !!this._socketProvider;
  }

  public get socketProvider() {
    return this._socketProvider;
  }

  public get signer() {

    this.scheduleNonceReset();

    return this._signer;
  }


  private scheduleNonceReset() {

    const now = (new Date()).getTime();

    if (this.nonceResetTime < now) {

      const timer = this.relayerInterval - 20000; // fire 20 seconds before next interval

      this.nonceResetTime = now + timer;

      setTimeout(() => {

        this.resetNonce();

      }, timer);

    }

  }


  private async resetNonce() {

    this._signer.getTransactionCount().then(count => {

      this._signer.setTransactionCount(count);

    });

  }

}
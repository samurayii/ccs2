

export * from "./interfaces";

import { EventEmitter } from "events";
import { ILoggerEventEmitter } from "logger-event-emitter";
import { IKeyStore, IKeyStoreConfig, IKeyStoreEventName, KeyStore } from "../key-store";
import { IKeyStoreRepository } from "./interfaces";

export * from "./interfaces";

export class KeyStoreRepository extends EventEmitter implements IKeyStoreRepository {

    private readonly _repository: {
        [key: string]: IKeyStore
    };

    constructor (
        configs: IKeyStoreConfig[],
        private readonly _logger: ILoggerEventEmitter
    ) {
        super();
        this._repository = {};
        for (const key_store_config of configs) {
            const key_store = new KeyStore(key_store_config, this._logger.child(`${this._logger.name}:${key_store_config.name}`));
            key_store.on("change", (name: string) => {
                this.emit("change", name, key_store.name);
            });
            key_store.on("delete", (name: string) => {
                this.emit("delete", name, key_store.name);
            });
            key_store.on("new", (name: string) => {
                this.emit("new", name, key_store.name);
            });
            this._repository[key_store.name] = key_store;
        }
    }
        
    override on (event_name: IKeyStoreEventName, listener: (...args: unknown[]) => void): this {
        super.on(event_name, listener);
        return this;
    }
    override emit (event_name: IKeyStoreEventName, ...args: unknown[]): boolean {
        return super.emit(event_name, ...args);
    }

    get list (): string[] {
        return Object.keys(this._repository);
    }

    get listKeys (): string[] {
        let result: string[] = [];
        for (const key_store of Object.values(this._repository)) {
            result = result.concat(key_store.list);
        }
        return result;
    }

    exist (key_store_name: string): boolean {
        if (this._repository[key_store_name] === undefined) {
            return false;
        }
        return true;
    }
    
    get (key_store_name: string): IKeyStore {
        return this._repository[key_store_name];
    }

    async run (): Promise<void> {
        for (const key_store of Object.values(this._repository)) {
            await key_store.run();
        }
    }

    async close (): Promise<void> {
        for (const key_store of Object.values(this._repository)) {
            key_store.removeAllListeners();
            await key_store.close();
        }
    }
    
}
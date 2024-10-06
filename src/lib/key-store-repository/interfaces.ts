import { EventEmitter } from "events";
import { IKeyStore, IKeyStoreEventName } from "../key-store";

export interface IKeyStoreRepository extends EventEmitter {
    list: string[]
    listKeys: string[]
    on: (event_name: IKeyStoreEventName, listener: (...args: unknown[]) => void) => this
    emit: (event_name: IKeyStoreEventName, ...args: unknown[]) => boolean
    exist: (key_store_name: string) => boolean
    get: (key_store_name: string) => IKeyStore
    run: () => Promise<void>
    close: () => Promise<void>
}
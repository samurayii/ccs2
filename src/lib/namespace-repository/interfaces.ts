import { EventEmitter } from "events";
import { INamespace, INamespaceEventName } from "../namespace";

export interface INamespaceRepository extends EventEmitter {
    list: string[]
    listFiles: string[]
    on: (event_name: INamespaceEventName, listener: (...args: unknown[]) => void) => this
    emit: (event_name: INamespaceEventName, ...args: unknown[]) => boolean
    exist: (namespace_name: string) => boolean
    get: (namespace_name: string) => INamespace
    run: () => Promise<void>
    close: () => Promise<void>
    search: (pattern: string) => Promise<string[]>
}
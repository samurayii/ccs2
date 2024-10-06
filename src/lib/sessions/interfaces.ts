import { EventEmitter } from "events";

export type ISessionsEventName = "remote" | "add"
export interface ISessions extends EventEmitter {
    on: (event_name: ISessionsEventName, listener: (...args: unknown[]) => void) => this
    emit: (event_name: ISessionsEventName, ...args: unknown[]) => boolean
    add: (client_id: ISessionsClientConfig) => ISessionsClient
    exist: (id: string) => boolean
    get: (id: string) => ISessionsClient
    remove: (id: string) => void
}

export interface ISessionsConfig {
    ttl: number
}

export type ISessionsClientEventName = "outdated"
export interface ISessionsClient extends EventEmitter {
    id: string
    name: string
    group: string
    settings: ISessionsClientSettings 
    properties: ISessionsClientProperties
    on: (event_name: ISessionsClientEventName, listener: (...args: unknown[]) => void) => this
    emit: (event_name: ISessionsClientEventName, ...args: unknown[]) => boolean
    updateTTL: () => void
    init: () => void
    destroy: () => void
}
export interface ISessionsClientSettings {
    [key: string]: unknown
}
export interface ISessionsClientProperties {
    [key: string]: unknown
}
export interface ISessionsClientConfig {
    name: string
    group: string
    settings: ISessionsClientSettings 
    properties: ISessionsClientProperties
}

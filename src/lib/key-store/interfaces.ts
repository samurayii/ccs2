import { EventEmitter } from "events";

export type IKeyStoreEventName = "new" | "change" | "delete"

export interface IKeyStore extends EventEmitter {
    name: string
    list: string[]
    on: (event_name: IKeyStoreEventName, listener: (...args: unknown[]) => void) => this
    emit: (event_name: IKeyStoreEventName, ...args: unknown[]) => boolean
    run: () => Promise<void>
    close: () => Promise<void>
    existKey: (id: string) => Promise<boolean>
    getKey: (id: string) => Promise<unknown>
}

export interface IKeyStoreSource extends EventEmitter {
    list: string[]
    on: (event_name: IKeyStoreEventName, listener: (...args: unknown[]) => void) => this
    emit: (event_name: IKeyStoreEventName, ...args: unknown[]) => boolean
    run: () => Promise<void>
    close: () => Promise<void>
    existKey: (id: string) => Promise<boolean>
    getKey: (id: string) => Promise<unknown>
}

export interface IKeyStoreConfig {
    name: string
    enable: boolean
    description: string
    source: IKeyStoreSourceConfig
}

export type TKeyStoreSourceConfigType = "env" | "git" | "fs" | "git-crypt" | "vault-v1"

export interface IKeyStoreSourceConfig {
    type: TKeyStoreSourceConfigType
}

export interface IKeyStoreSourceEnvConfig extends IKeyStoreSourceConfig {
    key_prefix: string
}

export interface IKeyStoreSourceFSConfig extends IKeyStoreSourceConfig {
    include_regexp: string
    exclude_regexp: string
    size: string
    path: string
    cron: {
        enable: boolean
        jitter: number
        interval: string,
        time_zone: string
    }
}

export interface IKeyStoreSourceGitConfig extends IKeyStoreSourceConfig {
    include_regexp: string
    exclude_regexp: string
    size: string
    tmp: string
    cron: {
        enable: boolean
        jitter: number
        interval: string,
        time_zone: string
    }
    commit_count: number
    repository: string
    branch: string
}

export interface IKeyStoreSourceGitCryptConfig extends IKeyStoreSourceGitConfig {
    crypt_key_path: string
}

export interface IKeyStoreSourceVaultV1Config extends IKeyStoreSourceConfig {
    token: string
    secrets: string[]
    connection: {
        host: string
        protocol: "http" | "https"
        port: number
        path: string
        timeout: string
    }    
    refresh: {
        interval: string
        jitter: string
    }
}
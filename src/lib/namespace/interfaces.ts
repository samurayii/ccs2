import { EventEmitter } from "events";

export type INamespaceEventName = "new" | "change" | "delete"
export interface INamespace extends EventEmitter {
    enable: boolean
    name: string
    description: string
    links: string[]
    list: string[]
    on: (event_name: INamespaceEventName, listener: (...args: unknown[]) => void) => this
    emit: (event_name: INamespaceEventName, ...args: unknown[]) => boolean
    run: () => Promise<void>
    close: () => Promise<void>
    existFile: (id: string) => Promise<boolean>
    getFile: (id: string) => Promise<string>
}

export interface INamespaceSource extends EventEmitter {
    list: string[]
    on: (event_name: INamespaceEventName, listener: (...args: unknown[]) => void) => this
    emit: (event_name: INamespaceEventName, ...args: unknown[]) => boolean
    run: () => Promise<void>
    close: () => Promise<void>
    existFile: (id: string) => Promise<boolean>
    getFile: (id: string) => Promise<string>
}

export interface INamespaceConfig {
    name: string
    enable: boolean
    links: string[]
    description: string
    source: INamespaceSourceConfig
}

export type TNamespaceSourceConfigType = "git" | "fs" | "git-crypt"

export interface INamespaceSourceConfig {
    type: TNamespaceSourceConfigType
}

export interface INamespaceSourceGitConfig extends INamespaceSourceConfig {
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

export interface INamespaceSourceGitCryptConfig extends INamespaceSourceGitConfig {
    crypt_key_path: string
}

export interface INamespaceSourceFSConfig extends INamespaceSourceConfig {
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

import { ILoggerEventEmitterConfig } from "logger-event-emitter";
import { IMetricsConfig } from "./metrics";
import { INamespaceConfig } from "./namespace";
import { IKeyStoreConfig } from "./key-store";
import { IGathererConfig } from "./gatherer";
import { ISessionsConfig } from "./sessions";
import { IAuthorizationConfig } from "./authorization";

export interface IApiServerConfig {
    enable: boolean
    logging: boolean
    port: number
    hostname: string
    backlog: number
    prefix: string
    connection_timeout: number
    keep_alive_timeout: number
    body_limit: string
    trust_proxy: boolean
}

export interface IAppConfig {
    logger: ILoggerEventEmitterConfig
    api: IApiServerConfig
    metrics: IMetricsConfig
    namespaces: INamespaceConfig[]
    key_stores: IKeyStoreConfig[]
    gatherer: IGathererConfig
    sessions: ISessionsConfig
    authorization: IAuthorizationConfig
}
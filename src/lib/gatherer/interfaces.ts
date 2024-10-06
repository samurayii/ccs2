import { ISessionsClientProperties } from "../sessions";

export interface IGathererConfig {
    thread_count: number
    iterations: number
    template_engine: {
        delimiters: string[]
    }
}

export interface IGatherer {
    gathering: (file: string, properties: ISessionsClientProperties) => Promise<IGathererGatheringResult>
    getFileKey: (key_name: string, file: string, properties: ISessionsClientProperties) => Promise<IGathererGetFileKeyResult>
    run: () => Promise<void>
    close: () => Promise<void>
}

export interface ICache {
    add: (id: string, body: string) => void
    exist: (id: string) => boolean
    remove: (id: string) => void
    clear: () => void
}
export interface IGathererGatheringCacheRecord {
    key_dependencies: string[]
    file_dependencies: string[]
    keys: {
        [keys: string]: unknown
    }
    path: string
    hash: string
    body: string
}
export interface IGathererGatheringResult {
    status: "success" | "fail"
    message?: string
    data?: IGathererGatheringCacheRecord
}
export interface IGathererGetFileKeyResult {
    status: "success" | "fail"
    message?: string
    data?: {
        path: string
        hash: string
        name: string
        value: unknown
    }
}




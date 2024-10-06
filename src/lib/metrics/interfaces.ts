import { EventEmitter } from "events";

export type IMetricEventName = "metric"
export interface IMetricEventBody {
    name: string
    value: number
    labels: IMetricLabels
}
export type IMetricType = "counter" | "gauge" | "histogram" | "summary"
export interface IMetricLabels {
    [key: string]: string
}
export interface IMetrics extends EventEmitter {
    on: (event_name: IMetricEventName, listener: (...args: unknown[]) => void) => this
    emit: (event_name: IMetricEventName, ...args: unknown[]) => boolean
    getTXT: () => string
    add: (metric_name: string, value: number, labels?: IMetricLabels) => void
    createCounter: (metric_name: string, help?: string, labels?: IMetricLabels) => void
    createGauge: (metric_name: string, help?: string, labels?: IMetricLabels) => void
    createHistogram: (metric_name: string, buckets: number[], help?: string, labels?: IMetricLabels) => void
    run: () => Promise<void>
    close: () => Promise<void>
}

export interface IMetricsConfig {
    enable: boolean
    timestamp: boolean
    prefix: string
    default: boolean
    add_hostname: boolean
    labels: IMetricLabels
}

export interface IMetricsStore {
    readonly name: string
    readonly type: IMetricType
    readonly help: string
    list: () => IMetric[]
    add: (value: number, labels: IMetricLabels) => IMetric
    getTXT: (timestamp_flag: boolean) => string
}
export interface IMetricsStoreConfig {
    name: string
    type: IMetricType
    help: string
    default_labels: IMetricLabels
    buckets?: number[]
}

export interface IMetric {
    readonly id: string
    readonly labels: IMetricLabels
    getTXT: (timestamp_flag: boolean) => string
    addValue: (value: number) => void 
}
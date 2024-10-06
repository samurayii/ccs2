import { IMetricEventBody, IMetricEventName, IMetricLabels, IMetrics, IMetricsConfig, IMetricsStore } from "./interfaces";
import { EventEmitter } from "events";
import { ILoggerEventEmitter } from "logger-event-emitter";
import { MetricsStore } from "./lib/store";
import { hostname } from "os";

export * from "./interfaces";

export class Metrics extends EventEmitter implements IMetrics {

    private _uptime_id_interval: ReturnType<typeof setTimeout>;

    private readonly _store: {
        [key: string]: IMetricsStore
    };

    constructor (
        private readonly _config: IMetricsConfig,
        private readonly _logger: ILoggerEventEmitter
    ) {
        super();
        this._store = {};
        this.createCounter("uptime", "process uptime");
        if (this._config.add_hostname === true) {
            this._config.labels["hostname"] = hostname();
        }
    }
    
    override on (event_name: IMetricEventName, listener: (...args: unknown[]) => void): this {
        super.on(event_name, listener);
        return this;
    }
    override emit (event_name: IMetricEventName, ...args: unknown[]): boolean {
        return super.emit(event_name, ...args);
    }

    private _calcUptime (): void {
        this.add("uptime", 1);
        this._uptime_id_interval = setTimeout(() => {
            this._calcUptime();
        }, 1000);
    }

    async run (): Promise<void> {
        if (this._config.default === true) {
            this._calcUptime();
        }
    }

    async close (): Promise<void> {
        clearTimeout(this._uptime_id_interval);
    }

    createCounter (metric_name: string, help: string = "", labels: IMetricLabels = {}): void {

        if (this._config.enable === false) {
            return;
        }

        metric_name = `${this._config.prefix}${metric_name}`;

        if (this._store[metric_name] !== undefined) {
            return;
        }

        this._store[metric_name] = new MetricsStore({
            name: metric_name,
            type: "counter",
            help: help,
            default_labels: {
                ...labels,
                ...this._config.labels
            }
        }, this._logger);

    }
    createGauge (metric_name: string, help: string = "", labels: IMetricLabels = {}): void {

        if (this._config.enable === false) {
            return;
        }

        metric_name = `${this._config.prefix}${metric_name}`;

        if (this._store[metric_name] !== undefined) {
            return;
        }

        this._store[metric_name] = new MetricsStore({
            name: metric_name,
            type: "gauge",
            help: help,
            default_labels: {
                ...labels,
                ...this._config.labels
            }
        }, this._logger);

    }

    createHistogram (metric_name: string, buckets: number[], help: string = "", labels: IMetricLabels = {}): void {

        if (this._config.enable === false) {
            return;
        }

        metric_name = `${this._config.prefix}${metric_name}`;

        if (this._store[metric_name] !== undefined) {
            return;
        }

        this._store[metric_name] = new MetricsStore({
            name: metric_name,
            type: "histogram",
            help: help,
            default_labels: {
                ...labels,
                ...this._config.labels
            },
            buckets: buckets
        }, this._logger);

    }
    
    add (metric_name: string, value: number, labels: IMetricLabels = {}): void {

        if (this._config.enable === false) {
            return;
        }

        metric_name = `${this._config.prefix}${metric_name}`;

        if (this._store[metric_name] === undefined) {
            return;
        }

        const metric = this._store[metric_name].add(value, labels);

        this.emit("metric", <IMetricEventBody>{
            name: metric_name,
            value: value,
            labels: metric.labels
        });
    }

    getTXT (): string {

        let result = "";

        for (const metric_name in this._store) {
            const metric_store = this._store[metric_name];
            result = `${result}${metric_store.getTXT(this._config.timestamp)}`;
        }

        return result;

    }
    
}
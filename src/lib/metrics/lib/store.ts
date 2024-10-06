import { ILoggerEventEmitter } from "logger-event-emitter";
import { sortObject } from "../../tools/sort_object";
import { IMetric, IMetricLabels, IMetricsStore, IMetricsStoreConfig, IMetricType } from "../interfaces";
import { MetricCounter } from "./counter";
import { MetricGauge } from "./gauge";
import chalk from "chalk";
import { MetricHistogram } from "./histogram";

export class MetricsStore implements IMetricsStore {

    private readonly _store: {
        [key: string]: IMetric
    };

    constructor (
        private readonly _config: IMetricsStoreConfig,
        private readonly _logger: ILoggerEventEmitter
    ) {
        this._store = {};
    }
    
    get type (): IMetricType {
        return this._config.type;
    }
    get help (): string {
        return this._config.help;
    }
    get name (): string {
        return this._config.name;
    }

    list (): IMetric[] {
        return Object.values(this._store);
    }

    add (value: number, labels: IMetricLabels): IMetric {

        const result_labels = {
            ...labels,
            ...this._config.default_labels
        };
        const id = `${JSON.stringify(sortObject(result_labels))}`;

        if (this._store[id] === undefined) {
            if (this._config.type === "counter") {
                this._store[id] = new MetricCounter(this._config.name, id, result_labels);
            }
            if (this._config.type === "gauge") {
                this._store[id] = new MetricGauge(this._config.name, id, result_labels);
            }
            if (this._config.type === "histogram") {
                this._store[id] = new MetricHistogram(this._config.name, id, this._config.buckets, result_labels);
            }
            this._logger.debug(`Metric ${chalk.cyan(this._config.name)} type ${chalk.cyan(this._config.type)} created`);
        }

        this._store[id].addValue(value);

        return this._store[id];

    }

    getTXT (timestamp_flag: boolean): string {

        let result = "";

        result = `${result}#HELP ${this._config.name} ${this._config.help}\n`;
        result = `${result}#TYPE ${this._config.name} ${this._config.type.toLowerCase()}\n`;

        for (const metric of Object.values(this._store)) {
            result = `${result}${metric.getTXT(timestamp_flag)}`;
        }

        return `${result}\n`;

    }

}
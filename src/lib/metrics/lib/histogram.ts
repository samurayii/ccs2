import { IMetric, IMetricLabels } from "../interfaces";

export class MetricHistogram implements IMetric {

    private _timestamp: number;
    private readonly _result_buckets: {
        [key: string]: {
            value: number,
            label: string
            le: number
        }
    };
    private _inf: number;
    private _sum: number;
    private _result_labels: string[];

    constructor (
        private readonly _name: string,
        private readonly _id: string,
        private readonly _buckets: number[],
        private readonly _labels: IMetricLabels
    ) {
        this._timestamp = Date.now();
        this._inf = 0;
        this._sum = 0;
        this._result_buckets = {};
        this._result_labels = [];

        for (const label_name in this._labels) {
            this._result_labels.push(`${label_name}="${this._labels[label_name]}"`);
        }

        for (const bucket of this._buckets) {
            const label = `${bucket}`;
            this._result_buckets[label] = {
                value: 0,
                label: label,
                le: bucket
            };
        }

    }
    
    get id (): string {
        return this._id;
    }
    get labels (): IMetricLabels {
        return this._labels;
    }

    addValue (value: number): void {
        this._inf += 1;
        this._sum += value;
        this._timestamp = Date.now();
        for (const bucket_name in this._result_buckets) {
            const bucket = this._result_buckets[bucket_name];
            if (value <= bucket.le) {
                this._result_buckets[bucket_name].value += 1;
            }
        }
    }

    getTXT (timestamp_flag: boolean): string {

        let result = "";

        for (const bucket_name in this._result_buckets) {

            const bucket_labels = this._result_labels.concat([`le="${this._result_buckets[bucket_name].label}"`]);

            if (timestamp_flag === true) {
                result = `${result}${this._name}_bucket{${bucket_labels.join(",")}} ${this._result_buckets[bucket_name].value} ${this._timestamp}\n`;
            } else {
                result = `${result}${this._name}_bucket{${bucket_labels.join(",")}} ${this._result_buckets[bucket_name].value}\n`;
            }

        }

        if (timestamp_flag === true) {
            result = `${result}${this._name}_bucket{${(this._result_labels.concat(["le=\"+inf\""])).join(",")}} ${this._inf} ${this._timestamp}\n`;
            result = `${result}${this._name}_sum{${this._result_labels.join(",")}} ${this._sum} ${this._timestamp}\n`;
            result = `${result}${this._name}_count{${this._result_labels.join(",")}} ${this._inf} ${this._timestamp}\n`;
        } else {
            result = `${result}${this._name}_bucket{${(this._result_labels.concat(["le=\"+inf\""])).join(",")}} ${this._inf}\n`;
            result = `${result}${this._name}_sum{${this._result_labels.join(",")}} ${this._sum}\n`;
            result = `${result}${this._name}_count{${this._result_labels.join(",")}} ${this._inf}\n`;
        }

        return result;

    }
}
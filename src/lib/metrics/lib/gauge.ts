import { IMetric, IMetricLabels } from "../interfaces";

export class MetricGauge implements IMetric {

    private _value: number;
    private _timestamp: number;
    private _result_labels: string[];

    constructor (
        private readonly _name: string,
        private readonly _id: string,
        private readonly _labels: IMetricLabels
    ) {
        this._value = 0;
        this._timestamp = Date.now();
        this._result_labels = [];

        for (const label_name in this._labels) {
            this._result_labels.push(`${label_name}="${this._labels[label_name]}"`);
        }

    }
    
    get id (): string {
        return this._id;
    }
    get labels (): IMetricLabels {
        return this._labels;
    }

    addValue (value: number): void {
        this._value = value;
        this._timestamp = Date.now();
    }

    getTXT (timestamp_flag: boolean): string {

        let result = "";      

        if (timestamp_flag === true) {
            result = `${result}${this._name}{${this._result_labels.join(",")}} ${this._value} ${this._timestamp}\n`;
        } else {
            result = `${result}${this._name}{${this._result_labels.join(",")}} ${this._value}\n`;
        }

        return result;

    }
}
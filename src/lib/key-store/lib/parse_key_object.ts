import { sortObject } from "../../tools/sort_object";

export interface IParseKeyObjectTarget {
    [key: string]: unknown
}

export interface IParseKeyObjectResult {
    name: string
    value: unknown
}

export function parseKeyObject (object: IParseKeyObjectTarget, prefix: string = ""): IParseKeyObjectResult[] {

    let result: IParseKeyObjectResult[] = [];
    
    for (const key_name in object) {

        const key_value = object[key_name];

        if (typeof key_value === "boolean" || typeof key_value === "number" || typeof key_value === "string" ) {
            result.push({
                name: `${prefix}.${key_name}`,
                value: key_value
            });
            continue;
        }

        if (Array.isArray(key_value) === true) {
            const value = JSON.stringify(key_value);
            result.push({
                name: `${prefix}.${key_name}`,
                value: value
            });
            continue;
        }

        if (typeof key_value === "object" && Array.isArray(key_value) === false) {
            const sub_prefix = `${prefix}.${key_name}`;
            const value = JSON.stringify(sortObject(key_value));
            result.push({
                name: sub_prefix,
                value: value
            });
            const sub_keys_list = parseKeyObject(<IParseKeyObjectTarget>key_value, sub_prefix);
            result = result.concat(sub_keys_list);
            continue;
        }

    }

    return result;

}
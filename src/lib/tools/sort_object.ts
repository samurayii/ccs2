type TObj = {
    [key: string]: unknown
}

function sortArray(array: unknown[]): unknown[] {
    
    let buffer_array: unknown[] = [];
    const result_array: unknown[] = [];
    const links_map: {[key: string]: unknown} = {};

    for (let key_value of array) {
        if (typeof key_value === "object") {
            if (Array.isArray(key_value) === false) {
                key_value = sortObject(key_value);
                const id = JSON.stringify(key_value);
                links_map[id] = key_value;
                buffer_array.push(id);
            } else {
                key_value = sortArray(<unknown[]>key_value);
                buffer_array.push(key_value);
            }
        } else {
            buffer_array.push(key_value);
        }
    }

    buffer_array = buffer_array.sort();

    for (const array_value of buffer_array) {
        if (typeof array_value === "string") {
            if (links_map[array_value] !== undefined) {
                result_array.push(links_map[array_value]);
                continue;
            }
        }
        result_array.push(array_value);
    }

    return result_array;
}

export function sortObject<T=unknown>(obj: unknown): T {
    if (typeof obj !== "object" || Array.isArray(obj) === true || obj === null) {
        return <T>obj;
    }
    const keys = Object.keys(obj).sort();
    const result: TObj = {};
    for (const key of keys) {
        const key_value = (<TObj>obj)[key];
        if (typeof key_value !== "object" || obj === null) {
            result[key] = key_value;
        } else {
            if (Array.isArray(key_value) === true) {
                result[key] = sortArray(<unknown[]>key_value);
            } else {
                result[key] = sortObject(<TObj>key_value);
            }
        }
    }
    return <T>result;
}
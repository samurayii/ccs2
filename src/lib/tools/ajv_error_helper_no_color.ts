import { ValidateFunction } from "ajv";

export function AjvErrorHelperNoColor (validate: ValidateFunction): string {

    let result = "";

    for (const item of validate.errors) {
        result = `${result}  - Key "${item.instancePath.replace(/^\//, "")}" ${item.message}`;
        if (item.keyword === "additionalProperties") {
            result = `${result}. Key "${item.params?.["additionalProperty"]}" superfluous`;
        }
        result = `${result}\n`;
    }

    return result;

}
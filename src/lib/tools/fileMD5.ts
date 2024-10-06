import * as fs from "fs";
import * as crypto from "crypto";

export function fileMD5 (file_path: string): Promise<string> {
    return new Promise((resolve, reject) => {

        const output = crypto.createHash("md5");
        const input = fs.createReadStream(file_path);

        input.on("error", (error) => {
            reject(error);
        });

        output.once("readable", () => {
            resolve(output.read().toString("hex"));
        });

        input.pipe(output);
    });
}
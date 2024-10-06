

import * as fs from "fs";

export function promiseFsExists (file_path: string): Promise<boolean> {
    return new Promise( (resolve) => {
        fs.access(file_path, fs.constants.R_OK | fs.constants.W_OK, (error) => {
            if (error === null) {
                return resolve(true);
            }
            resolve(false);
        }); 
    });
}
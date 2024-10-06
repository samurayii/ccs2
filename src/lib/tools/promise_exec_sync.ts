import { ExecSyncOptionsWithBufferEncoding, exec } from "child_process";
export function promiseExecSync (command: string, options: ExecSyncOptionsWithBufferEncoding): Promise<string> {
    return new Promise( (resolve, reject) => {
        exec(command, options, (error, stdout) => {
            if (error === null) {
                return resolve(stdout.toString());
            }
            reject(error);
        }); 
    });
}
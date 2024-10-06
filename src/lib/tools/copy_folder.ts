import * as fs from "fs";
import * as path from "path";

export function copyFolderSync (src: string, dest: string ): void {

    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory === true) {
        fs.mkdirSync(dest, {recursive: true});
        fs.readdirSync(src).forEach(function(childItemName) {
            copyFolderSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }

}
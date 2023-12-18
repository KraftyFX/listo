import { app } from 'electron';
import pathToFfmpeg from 'ffmpeg-ffprobe-static';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'node:fs';
import { join } from 'upath';

const desktop = app.getPath('desktop');
const listoRootDir = join(desktop, 'listo');

// ffmpeg.setFfmpegPath(pathToFfmpeg.ffmpegPath!);
// ffmpeg.setFfprobePath(pathToFfmpeg.ffprobePath!);

ffmpeg.setFfmpegPath(`/Users/rafikhan/kraftyfx/listo/node_modules/ffmpeg-ffprobe-static/ffmpeg`);
ffmpeg.setFfprobePath(`/Users/rafikhan/kraftyfx/listo/node_modules/ffmpeg-ffprobe-static/ffprobe`);

console.log(pathToFfmpeg);

export function beginStitchingWebmFiles() {
    const webmFiles = fs
        .readdirSync(listoRootDir)
        .filter((file) => file.endsWith('._webm'))
        .map((file) => join(listoRootDir, file));

    if (webmFiles.length === 3) {
        console.log('joining');

        let lib = ffmpeg();

        webmFiles.forEach((file) => (lib = lib.addInput(file)));

        lib.concat(join(listoRootDir, `joined.webm`))
            .on('progress', (progress) => {
                console.log(progress);
            })
            .on('error', (err, stdout, stderr) => {
                console.error(err);
            })
            .on('end', () => {
                console.log('done');

                webmFiles.forEach((file) => fs.rmSync(file));
            });
    }
}

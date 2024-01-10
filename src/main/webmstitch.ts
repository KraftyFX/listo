import pathToFfmpeg from 'ffmpeg-ffprobe-static';
import ffmpeg, { ffprobe } from 'fluent-ffmpeg';
import * as fs from 'node:fs';
import { join } from 'upath';
import { listoRootDir } from './constants';

// ffmpeg.setFfmpegPath(pathToFfmpeg.ffmpegPath!);
// ffmpeg.setFfprobePath(pathToFfmpeg.ffprobePath!);

ffmpeg.setFfmpegPath(`/Users/rafikhan/kraftyfx/listo/node_modules/ffmpeg-ffprobe-static/ffmpeg`);
ffmpeg.setFfprobePath(`/Users/rafikhan/kraftyfx/listo/node_modules/ffmpeg-ffprobe-static/ffprobe`);

console.log(pathToFfmpeg);

export function log(filepath: string) {
    ffprobe(filepath, (err, data) => {
        console.log(data);
    });
}

export function beginStitchingWebmFiles() {
    const webmFiles = fs
        .readdirSync(listoRootDir)
        .filter((file) => file.endsWith('._webm'))
        .map((file) => join(listoRootDir, file));

    if (webmFiles.length === 1) {
        log(join(listoRootDir, `joined.webm`));
    }

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

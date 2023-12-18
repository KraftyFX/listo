import dayjs from 'dayjs';
import { app } from 'electron';
import * as fs from 'node:fs';
import { join } from 'upath';
import { ListoApiKeys } from '~/preload/listoApi';
import { IpcMainHandlers } from './interfaces';
import { beginStitchingWebmFiles } from './webmstitch';

const desktop = app.getPath('desktop');
const listoRootDir = join(desktop, 'listo');

export const listoApi: IpcMainHandlers<ListoApiKeys> = {
    startNewRecording(event: Electron.IpcMainInvokeEvent, chunks: Uint8Array[]) {
        const recordingFilename = dayjs().format('YYYY-MM-DD-h-mm-ssa') + `.webm`;
        const recordingFilepath = join(listoRootDir, recordingFilename);

        if (!fs.existsSync(listoRootDir)) {
            fs.mkdirSync(listoRootDir, { recursive: true });
        }

        if (fs.existsSync(recordingFilepath)) {
            fs.rmSync(recordingFilepath);
        }

        fs.appendFileSync(recordingFilepath, chunks[0]);

        return `listo://recordings/${recordingFilename}`;
    },

    appendToRecording(event: Electron.IpcMainInvokeEvent, path: string, chunks: Uint8Array[]) {
        if (!path.startsWith('listo://recordings/')) {
            throw new Error(`Unrecognized filepath ${path}`);
        }

        const recordingFilename = path.substring('listo://recordings/'.length);
        const recordingFilepath = join(listoRootDir, recordingFilename);

        if (!fs.existsSync(recordingFilepath)) {
            throw new Error(`File ${recordingFilepath} does not exist.`);
        }

        fs.appendFileSync(recordingFilepath, chunks[0]);

        return true;
    },

    saveRecording(
        event: Electron.IpcMainInvokeEvent,
        startTimeIso: string,
        durationSec: number,
        chunks: Uint8Array[]
    ) {
        const startTimeFormat = dayjs(startTimeIso).format('YYYY-MM-DD-h-mm-ssa');
        const recordingFilename = `${startTimeFormat}-${durationSec.toFixed(3)}._webm`;
        const recordingFilepath = join(listoRootDir, recordingFilename);

        if (!fs.existsSync(listoRootDir)) {
            fs.mkdirSync(listoRootDir, { recursive: true });
        }

        if (fs.existsSync(recordingFilepath)) {
            fs.rmSync(recordingFilepath);
        }

        fs.appendFileSync(recordingFilepath, chunks[0]);

        beginStitchingWebmFiles();

        return `listo://recordings/${recordingFilename}`;
    },
};

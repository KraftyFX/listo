import dayjs from 'dayjs';
import { app } from 'electron';
import * as fs from 'node:fs';
import { join } from 'upath';
import { ListoApiKeys } from '~/preload/listoApi';
import { IpcMainHandlers } from './interfaces';

const desktop = app.getPath('desktop');
const listoRootDir = join(desktop, 'listo');

export const listoApi: IpcMainHandlers<ListoApiKeys> = {
    getRecentRecordings(event: Electron.IpcMainInvokeEvent): string[] {
        if (!fs.existsSync(listoRootDir)) {
            fs.mkdirSync(listoRootDir, { recursive: true });
        }

        const entries = fs.readdirSync(listoRootDir, { withFileTypes: true });
        const webmFiles = entries
            .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.webm'))
            .map((e) => `listo://recordings/${e.name}`);

        return webmFiles;
    },

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

    async saveRecording(
        event: Electron.IpcMainInvokeEvent,
        startTimeIso: string,
        durationSec: number,
        chunks: Uint8Array[],
        hasErrors: boolean
    ) {
        const startTimeFormat = dayjs(startTimeIso).format('YYYY-MM-DD-h-mm-ssa');
        const suffix = hasErrors ? `-err` : ``;
        const recordingFilename = `${startTimeFormat}-${durationSec.toFixed(3)}${suffix}.webm`;
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
};

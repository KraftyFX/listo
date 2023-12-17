import dayjs from 'dayjs';
import { app } from 'electron';
import * as fs from 'node:fs';
import { join } from 'upath';
import { ListoApiKeys } from '~/preload/listoApi';
import { Segment } from '~/shared/interfaces';
import { IpcMainHandlers } from './interfaces';

const desktop = app.getPath('desktop');
const listoRootDir = join(desktop, 'listo');

export const listoApi: IpcMainHandlers<ListoApiKeys> = {
    getAllRecordings(event: Electron.IpcMainInvokeEvent) {
        const videoFiles = fs.readdirSync(desktop).filter((entry) => entry.endsWith('.webm'));

        return videoFiles.map((video, index) => {
            return {
                index,
                url: `listo://recordings/${index}`,
                duration: 10,
                startTime: 0,
                chunks: [],
            } as Segment;
        });
    },

    startNewRecording(event: Electron.IpcMainInvokeEvent, chunks: Uint8Array[]) {
        const recordingFilename = dayjs().format('YYYY-MM-DD-hh-mm-ssa') + `.webm`;
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
};

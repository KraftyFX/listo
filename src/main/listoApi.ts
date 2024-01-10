import dayjs from 'dayjs';
import * as fs from 'node:fs';
import { join } from 'upath';
import { ListoApiKeys, Recording } from '~/preload/listoApi';
import { listoRootDir } from './constants';
import { IpcMainHandlers } from './interfaces';
import { getRecordingsBetween } from './parseutil';

const timestampFormat = 'YYYY-MM-DD-h-mm-ssa';

export const listoApi: IpcMainHandlers<ListoApiKeys> = {
    async getRecentRecordings(
        event: Electron.IpcMainInvokeEvent,
        startTimeIso: string,
        endTimeIso: string
    ): Promise<Recording[]> {
        const startTime = dayjs(startTimeIso);
        const endTime = dayjs(endTimeIso);

        ensureRecordingDirectoryExists();

        const recordings = getRecordingsBetween(startTime, endTime);

        insertIntoPast(recordings, getRecordingsBetween(startTime, endTime, 'debug'));

        return recordings;
    },

    async startNewRecording(event: Electron.IpcMainInvokeEvent, chunks: Uint8Array[]) {
        const recordingFilename = dayjs().format(timestampFormat) + `.webm`;
        const recordingFilepath = join(listoRootDir, recordingFilename);

        ensureRecordingDirectoryExists();

        if (fs.existsSync(recordingFilepath)) {
            fs.rmSync(recordingFilepath);
        }

        fs.appendFileSync(recordingFilepath, chunks[0]);

        return `listo://recordings/${recordingFilename}`;
    },

    async appendToRecording(
        event: Electron.IpcMainInvokeEvent,
        path: string,
        chunks: Uint8Array[]
    ) {
        if (!path.startsWith('listo://recordings/')) {
            throw new Error(`Unrecognized filepath ${path}`);
        }

        const recordingFilename = path.substring('listo://recordings/'.length);
        const recordingFilepath = join(listoRootDir, recordingFilename);

        ensureRecordingDirectoryExists();

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
        const startTimeFormat = dayjs(startTimeIso).format(timestampFormat);
        const suffix = hasErrors ? `-err` : ``;
        const recordingFilename = `${startTimeFormat}-${durationSec.toFixed(3)}${suffix}.webm`;
        const recordingFilepath = join(listoRootDir, recordingFilename);

        ensureRecordingDirectoryExists();

        if (fs.existsSync(recordingFilepath)) {
            fs.rmSync(recordingFilepath);
        }

        fs.appendFileSync(recordingFilepath, chunks[0]);

        return `listo://recordings/${recordingFilename}`;
    },
};

function ensureRecordingDirectoryExists() {
    if (!fs.existsSync(listoRootDir)) {
        fs.mkdirSync(listoRootDir, { recursive: true });
    }
}

function insertIntoPast(recordings: Recording[], debugRecordings: Recording[]) {
    let startTime =
        recordings.length > 0 ? dayjs(recordings[0].startTimeIso, timestampFormat) : dayjs();

    startTime = startTime.subtract(5, 'seconds');

    for (let i = debugRecordings.length - 1; i >= 0; i--) {
        const debug = debugRecordings[i];

        startTime = startTime.subtract(debug.duration, 'seconds');

        const recording = { ...debug };

        recording.startTimeIso = startTime.toISOString();

        recordings.unshift(recording);
    }
}

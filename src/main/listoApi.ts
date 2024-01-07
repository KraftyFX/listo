import dayjs from 'dayjs';
import { app } from 'electron';
import * as fs from 'node:fs';
import { join } from 'upath';
import { ListoApiKeys, Recording } from '~/preload/listoApi';
import { IpcMainHandlers } from './interfaces';

const desktop = app.getPath('desktop');
const listoRootDir = join(desktop, 'listo');

const timestampFormat = 'YYYY-MM-DD-hh-mm-ssa';

export const listoApi: IpcMainHandlers<ListoApiKeys> = {
    getRecentRecordings(
        event: Electron.IpcMainInvokeEvent,
        startTimeIso: string,
        endTimeIso: string
    ): Recording[] {
        if (!fs.existsSync(listoRootDir)) {
            fs.mkdirSync(listoRootDir, { recursive: true });
        }

        const realRecordings = getRealRecordings();
        const debugRecordings = getDebugRecordings();

        // replace real recordings with their debug versions.
        while (debugRecordings.length > 0) {
            const debug = debugRecordings[0];
            const index = parseInt(debug.startTimeIso);

            if (index < realRecordings.length) {
                const real = realRecordings[index];

                real.url = debug.url;
                real.duration = debug.duration;
            }

            debugRecordings.shift();
        }

        return realRecordings;
    },

    startNewRecording(event: Electron.IpcMainInvokeEvent, chunks: Uint8Array[]) {
        const recordingFilename = dayjs().format(timestampFormat) + `.webm`;
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

function getDebugRecordings() {
    return getRecorings((name) => name.startsWith('debug-'))
        .map(getDebugRecordingFromFilename)
        .filter((r) => r) as Recording[];
}

function getRealRecordings() {
    return getRecorings((name) => !name.startsWith('debug-'))
        .map(getRealRecordingFromFilename)
        .filter((r) => r) as Recording[];
}

function getRecorings(filter: (name: string) => boolean) {
    const entries = fs.readdirSync(listoRootDir, { withFileTypes: true });
    const recordings = entries
        .filter((e) => e.isFile())
        .map((e) => e.name.toLowerCase())
        .filter((name) => name.endsWith('.webm') && filter(name));

    return recordings;
}

function getDebugRecordingFromFilename(name: string): Recording | null {
    try {
        const url = `listo://recordings/${name}`;

        name = name.substring(`debug-`.length);

        let hasErrors = false;
        if (name.endsWith(`-err.webm`)) {
            hasErrors = true;
            name = name.substring(0, name.length - `-err.webm`.length);
        } else {
            hasErrors = false;
            name = name.substring(0, name.length - `.webm`.length);
        }

        const indexPart = name.substring(0, name.indexOf(`-`));
        const durationPart = name.substring(indexPart.length + 1);

        return {
            startTimeIso: indexPart,
            duration: parseFloat(durationPart),
            url,
            hasErrors,
        };
    } catch (e) {
        console.error(`Could not parse ${name}`);
        console.error(e);

        return null;
    }
}

function getRealRecordingFromFilename(name: string): Recording | null {
    try {
        const url = `listo://recordings/${name}`;

        let hasErrors = false;
        if (name.endsWith(`-err.webm`)) {
            hasErrors = true;
            name = name.substring(0, name.length - `-err.webm`.length);
        } else {
            hasErrors = false;
            name = name.substring(0, name.length - `.webm`.length);
        }

        const startTimePart = name.substring(0, name.indexOf('m') + 1); // "m" is for am/pm
        const durationPart = name.substring(startTimePart.length + 1);

        return {
            startTimeIso: dayjs(startTimePart, timestampFormat).toISOString(),
            duration: parseFloat(durationPart),
            url,
            hasErrors,
        };
    } catch (e) {
        console.error(`Could not parse ${name}`);
        console.error(e);

        return null;
    }
}

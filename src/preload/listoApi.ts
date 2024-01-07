import { contextBridge, ipcRenderer } from 'electron';
import { toUint8Arrays } from './blobutil';

export interface Recording {
    startTimeIso: string;
    duration: number;
    url: string;
    hasErrors: boolean;
}

export const LISTO_API = {
    async getRecentRecordings(startTimeIso: string, endTimeIso: string): Promise<Recording[]> {
        return (await invoke('getRecentRecordings', startTimeIso, endTimeIso)) as Recording[];
    },

    async startNewRecording(chunks: Blob[]) {
        const arrays = await toUint8Arrays(chunks);

        return await invoke('startNewRecording', arrays);
    },

    async appendToRecording(path: string, chunks: Blob[]) {
        const chunkArray = await toUint8Arrays(chunks);

        return await invoke('appendToRecording', path, chunkArray);
    },

    async saveRecording(
        startTimeIso: string,
        durationSec: number,
        chunks: Blob[],
        hasErrors: boolean
    ) {
        const chunkArray = await toUint8Arrays(chunks);

        return await invoke('saveRecording', startTimeIso, durationSec, chunkArray, hasErrors);
    },
};

export type ListoApiKeys = keyof typeof LISTO_API;

function invoke(channel: ListoApiKeys, ...args: any[]) {
    return ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld('listoApi', LISTO_API);

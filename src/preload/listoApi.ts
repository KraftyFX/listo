import { contextBridge, ipcRenderer } from 'electron';
import { toUint8Arrays } from './blobutil';

export const LISTO_API = {
    async getAllRecordings() {
        return await invoke('getAllRecordings');
    },

    async startNewRecording(chunks: Blob[]) {
        const arrays = await toUint8Arrays(chunks);

        return await invoke('startNewRecording', arrays);
    },

    async appendToRecording(path: string, chunks: Blob[]) {
        const arrays = await toUint8Arrays(chunks);

        return await invoke('appendToRecording', path, arrays);
    },
};

export type ListoApiKeys = keyof typeof LISTO_API;

function invoke(channel: ListoApiKeys, ...args: any[]) {
    return ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld('listoApi', LISTO_API);

export type IpcMainHandler = (
    event: Electron.IpcMainInvokeEvent,
    ...args: any[]
) => Promise<any> | any;

export type IpcMainHandlers<K extends string> = {
    [key in K]: IpcMainHandler;
};

import { app } from 'electron';
import fs, { ReadStream } from 'node:fs';
import { join } from 'upath';

const desktop = app.getPath('desktop');
const listoRootDir = join(desktop, 'listo');

export const listoScheme = {
    scheme: 'listo',
    async handler(req: Request) {
        const { host, pathname } = new URL(req.url);

        if (host === 'recordings') {
            if (pathname.startsWith('/')) {
                const recordingFilename = pathname.substring('/'.length);
                const recordingFilepath = join(listoRootDir, recordingFilename);

                console.log('returning ' + recordingFilepath);

                const stream = fs.createReadStream(recordingFilepath);

                return new Response(toReadableStream(stream), {
                    headers: { 'content-type': 'video/webm' },
                });
            }
        }

        return new Response('Nothing found');
    },
};

function toReadableStream(stream: ReadStream) {
    const iterator = getStreamIterator();

    return new ReadableStream({
        async pull(controller) {
            const { value, done } = await iterator.next();

            if (done) {
                controller.close();
            } else {
                controller.enqueue(value);
            }
        },
    });

    async function* getStreamIterator() {
        for await (const chunk of stream) {
            yield chunk;
        }
    }
}

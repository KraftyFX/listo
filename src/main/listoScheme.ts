import dayjs from 'dayjs';
import { app } from 'electron';
import fs from 'node:fs';
import { join } from 'upath';

const desktop = app.getPath('desktop');
const listoRootDir = join(desktop, 'listo');

let reqId = 0;

export const listoScheme = {
    scheme: 'listo',
    async handler(req: Request) {
        const { host, pathname } = new URL(req.url);

        if (host === 'recordings') {
            if (pathname.startsWith('/')) {
                reqId++;

                const recordingFilename = pathname.substring('/'.length);
                const recordingFilepath = join(listoRootDir, recordingFilename);
                const cacheWindow = dayjs.duration({ hours: 1 });

                console.log('\n');
                console.log(`[${reqId}] returning ${req.url}`);

                return new Response(toReadableStream(recordingFilepath, reqId.toString()), {
                    headers: {
                        'content-type': 'video/webm',
                        'cache-control': `max-age=${cacheWindow.asSeconds()}`,
                    },
                });
            }
        }

        return new Response('Nothing found');
    },
};

function toReadableStream(filepath: string, tag: string) {
    const stream = fs.createReadStream(filepath);
    const iterator = getStreamIterator();
    let c = 0;

    return new ReadableStream({
        start(controller) {
            console.log(`[${tag}] start`);
        },

        async pull(controller) {
            try {
                const { value, done } = await iterator.next();

                if (done) {
                    console.log(`[${tag}] done`);
                    controller.close();
                } else {
                    if (++c % 150 === 0) console.log(`[${tag}] queue ${c}`);
                    controller.enqueue(value);
                }
            } catch (e) {
                controller.error(e);
            }
        },

        cancel(reason) {
            console.error(`[${tag}] was cancelled. ` + reason || '');
        },
    });

    async function* getStreamIterator() {
        console.log(`[${tag}] iterator start`);
        let c = 0;

        for await (const chunk of stream) {
            if (++c % 150 === 0) console.log(`[${tag}] yield ${c}`);
            yield chunk;
        }

        console.log(`[${tag}] iterator done`);
    }
}

import dayjs from 'dayjs';
import fs from 'node:fs';
import { join } from 'upath';
import { listoRootDir } from './constants';

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

                // console.log(`[${reqId}] returning ${req.url}`);

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

    return new ReadableStream({
        start(controller) {
            // console.log(`[${tag}] start`);
        },

        async pull(controller) {
            try {
                const { value, done } = await iterator.next();

                if (done) {
                    controller.close();
                } else {
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
        let c = 0;

        for await (const chunk of stream) {
            yield chunk;
        }
    }
}

import dayjs, { Dayjs } from 'dayjs';
import * as fs from 'node:fs';

import { join } from 'upath';
import { Recording } from '~/preload/listoApi';
import { listoRootDir } from './constants';

const timestampRe =
    /(?<timestamp>\d\d\d\d-\d\d-\d\d-\d\d-\d\d-\d\d(am|pm))-(?<duration>\d+\.\d+)(?<error>-err)?\.webm/i;
const replaceRe = /replace-(?<index>\d+)-(?<duration>\d+\.\d+)(?<error>-err)?\.webm/i;

export function getRecordingsBetween(startTime: Dayjs, endTime: Dayjs, dir: string = '') {
    const recordings: Recording[] = [];
    const replacements: Recording[] = [];

    const directory = join(listoRootDir, dir);

    fs.readdirSync(directory, { withFileTypes: true }).forEach((dirent, i) => {
        if (!dirent.isFile()) {
            return;
        }

        const { name } = dirent;

        const url = `listo://recordings/${name}`.replace(
            'recordings/',
            `${join(`recordings`, dir)}/`
        );
        const timestampMatch = name.match(timestampRe)?.groups;

        if (timestampMatch) {
            const { timestamp, duration, error } = timestampMatch;

            if (dayjs(timestamp).isBetween(startTime, endTime, 'day', '[]')) {
                recordings.push({
                    url,
                    startTimeIso: timestamp,
                    duration: parseFloat(duration),
                    hasErrors: !!error,
                });
            }
        }

        const replaceMatch = name.match(replaceRe)?.groups;

        if (replaceMatch) {
            const { index, duration, error } = replaceMatch;

            replacements.push({
                url,
                startTimeIso: index.toString(),
                duration: parseFloat(duration),
                hasErrors: !!error,
            });
        }
    });

    swapOutReplacements(recordings, replacements);

    return recordings;
}

function swapOutReplacements(recordings: Recording[], replacements: Recording[]) {
    replacements.forEach((replacement) => {
        const index = parseInt(replacement.startTimeIso);

        if (index < recordings.length) {
            const original = recordings[index];

            original.url = replacement.url;
            original.duration = replacement.duration;
        }
    });
}

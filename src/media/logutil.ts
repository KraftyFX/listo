import { LogLevel } from './dvrconfig';

const levels = {
    none: -1,
    error: 0,
    warn: 1,
    info: 2,
    log: 3,
};

export interface Logger {
    name: string;

    error(message: string): void;
    warn(message: string): void;
    info(message: string): void;
    log(message: string): void;
}

export function getLog(name: string, options: { logging: LogLevel }): Logger {
    const level = levels[options.logging || 'none'];

    return {
        name,
        error(message: string) {
            if (level <= levels.error) {
                console.error(`[${name}] ${message}`);
            }
        },

        warn(message: string) {
            if (level <= levels.warn) {
                console.warn(`[${name}] ${message}`);
            }
        },

        info(message: string) {
            if (level <= levels.info) {
                console.info(`[${name}] ${message}`);
            }
        },

        log(message: string) {
            if (level <= levels.log) {
                console.log(`[${name}] ${message}`);
            }
        },
    };
}

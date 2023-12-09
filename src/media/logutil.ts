import { LogLevel } from './interfaces';

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
            if (levels.error <= level) {
                console.error(`[${name}] ${message}`);
            }
        },

        warn(message: string) {
            if (levels.warn <= level) {
                console.warn(`[${name}] ${message}`);
            }
        },

        info(message: string) {
            if (levels.info <= level) {
                console.info(`[${name}] ${message}`);
            }
        },

        log(message: string) {
            if (levels.log <= level) {
                console.log(`[${name}] ${message}`);
            }
        },
    };
}

import { app } from 'electron';
import { join } from 'upath';

const desktop = app.getPath('desktop');
export const listoRootDir = join(desktop, 'listo');

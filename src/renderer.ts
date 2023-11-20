/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';
import { LiveRecorder } from './liverecorder';

window.onload = (async () => {
    await getDevices();

    const video = document.getElementById('camera') as HTMLMediaElement;
    const canvas = document.getElementById('camera') as HTMLCanvasElement;
    const rec = new LiveRecorder(video, canvas);

    (window as any).rec = rec;

    rec.onUpdate = (currentTime, duration, multiplier) => {
        currentTime = Math.floor(currentTime);
        duration = Math.floor(duration);

        const parts = [];

        if (currentTime === duration) {
            parts.push(currentTime);
        } else {
            parts.push(currentTime.toString() + ' / ' + duration.toString());
        }

        if (multiplier !== 0) {
            parts.push('@ ' + multiplier + 'x')
        }

        $('elapsed').innerText = parts.join(' ');
    };

    rec.onModeChange = (isLive) => {
        if (isLive) {
            showLiveStreamMode();
        } else {
            showPlaybackMode();
        }
    }

    await rec.initAndStartRecording();

    assign('play', 'click', () => { rec.play(); showPause(); });
    assign('pause', 'click', () => { rec.pause(); showPlay(); });

    assign('rewind', 'click', () => { rec.rewind(); showPause(); });
    assign('fastForward', 'click', () => { rec.fastforward(); showPause(); });
    assign('slowForward', 'click', () => { rec.slowForward(); showPause(); });
    assign('nextFrame', 'click', () => { rec.nextFrame(); showPlay(); });

    assign('mid', 'click', () => { rec.goToPlaybackTime(.5); });
    assign('live', 'click', () => { rec.switchToLiveStream(); });

    assign('lastNSec', 'click', () => { rec.switchToPlayback(); });
});

function showPause() {
    $('play').style.display = 'none';
    $('pause').style.display = '';
}

function showPlay() {
    $('play').style.display = '';
    $('pause').style.display = 'none';
}

function showLiveStreamMode() {
    $('slowForward').style.display = 'none';
    $('fastForward').style.display = 'none';
    $('nextFrame').style.display = 'none';

    showPause();
}

function showPlaybackMode() {
    $('slowForward').style.display = 'inline-block';
    $('fastForward').style.display = 'inline-block';
    $('nextFrame').style.display = 'inline-block';
}

async function getDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const menu = $("inputs");

    devices
        .filter(d => d.kind === 'videoinput')
        .forEach((device) => {
            const item = document.createElement("option");
            item.textContent = device.label;
            item.value = device.deviceId;
            menu.appendChild(item);
        });
}

function $(id: string) {
    return document.getElementById(id);
}

function assign(id:string, type:string, callback:EventListenerOrEventListenerObject) {
    const elt = $(id);
    elt.addEventListener(type, callback);
    return elt;
}

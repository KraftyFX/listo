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
import { initListo } from './main';
import { formatSeconds } from './media/dateutil';
import { DigitalVideoRecorder } from './media/digitalvideorecorder';
import { DvrOptions } from './media/dvrconfig';

window.onload = async () => {
    await initListo($('page'));

    return;

    showLiveStreamMode();

    await initDeviceList();

    const video = $('camera') as HTMLMediaElement;
    const options = {
        recording: {
            source: getSelectedVideoDeviceId(),
        },
    } as DvrOptions;
    const dvr = new DigitalVideoRecorder(video, options);

    window.dvr = dvr;

    dvr.on('timeupdate', (currentTime, duration, multiplier) => {
        currentTime = Math.floor(currentTime);
        duration = Math.floor(duration);

        const parts = [];

        if (currentTime === duration) {
            parts.push(formatSeconds(currentTime));
        } else {
            parts.push(formatSeconds(currentTime) + ' / ' + formatSeconds(duration));
        }

        if (multiplier !== 0) {
            parts.push('@ ' + multiplier + 'x');
        }

        $('elapsed').innerText = parts.join(' ');
    });

    dvr.on('modechange', (isLive) => {
        if (isLive) {
            showLiveStreamMode();
        } else {
            showPlaybackMode();
        }
    });

    dvr.on('play', () => showPause());
    dvr.on('pause', () => showPlay());

    let oldSegElt: HTMLElement | null = null;

    dvr.on('segmentrendered', (seg) => {
        if (oldSegElt) {
            oldSegElt.style.backgroundColor = '';
        }

        const segElt = $(`seg${seg.index}`);

        if (segElt) {
            segElt.style.backgroundColor = 'beige';
            oldSegElt = segElt;
        }
    });

    await dvr.showLiveStreamAndStartRecording();

    assign('play', 'click', () => dvr.play());
    assign('pause', 'click', () => dvr.pause());

    assign('rewind', 'click', () => dvr.rewind());
    assign('fastForward', 'click', () => dvr.fastforward());
    assign('slowForward', 'click', () => dvr.slowForward());
    assign('nextFrame', 'click', () => dvr.nextFrame());

    assign('mid', 'click', () => dvr.goToPlaybackTime(0.5));
    assign('live', 'click', () => dvr.switchToLiveStream());
};

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
}

function showPlaybackMode() {
    $('slowForward').style.display = 'inline-block';
    $('fastForward').style.display = 'inline-block';
    $('nextFrame').style.display = 'inline-block';

    updateSegmentList();
}

function updateSegmentList() {
    $('segments').innerHTML = window.dvr.segments.segments
        .map((s) => {
            return (
                `<div id="seg${s.index}">` +
                [
                    s.index,
                    s.startTime.toFixed(3),
                    '-',
                    (s.startTime + s.duration).toFixed(3),
                    `(${s.duration.toFixed(3)})`,
                ].join(' ')
            );
        })
        .join('</div>\n');
}

function getSelectedVideoDeviceId() {
    return localStorage.getItem('videoinput') || 'default';
}

async function initDeviceList() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const menu = $('inputs') as HTMLSelectElement;

    menu.onchange = () => {
        console.log(menu.value);
        localStorage.setItem('videoinput', menu.value);
    };

    const def = getSelectedVideoDeviceId();

    devices
        .filter((d) => d.kind === 'videoinput')
        .forEach((device) => {
            const item = document.createElement('option') as HTMLOptionElement;
            item.textContent = device.label;
            item.value = device.deviceId;
            item.selected = device.deviceId === def;

            menu.appendChild(item);
        });
}

function $(id: string) {
    return document.getElementById(id)!;
}

function assign(id: string, type: string, callback: EventListenerOrEventListenerObject) {
    const elt = $(id);
    elt.addEventListener(type, callback);
    return elt;
}

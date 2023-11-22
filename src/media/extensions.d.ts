import { DigitalVideoRecorder } from "./digitalvideorecorder";

declare global {
    interface Window {
        dvr: DigitalVideoRecorder
    }
  }
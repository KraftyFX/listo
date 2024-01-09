import { DEFAULT_RECORDING_OPTIONS } from '~/renderer/media';
import { ServiceLocator, setLocator } from '~/renderer/services';
import { HostService } from '~/renderer/services/host';
import { ListoService } from '~/renderer/services/listo';
import { MediaStreamReader } from '~/renderer/services/mediastreamreader';
import { VideoPlayer } from '~/renderer/services/videoplayer';

export async function initailizeServiceLocator(
    videoRef: React.MutableRefObject<HTMLVideoElement>,
    stream: MediaStream,
    mimeType: string
) {
    return setLocator(
        new ServiceLocator(
            new VideoPlayer(videoRef.current),
            new MediaStreamReader(stream, mimeType),
            new ListoService(),
            new HostService()
        )
    );
}

export async function getLiveStream(deviceId: string) {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            deviceId,
        },
    });

    if (!stream) {
        throw new Error(`The user denied access to the camera. Can't acquire live stream.`);
    }

    const { mimeType } = DEFAULT_RECORDING_OPTIONS;

    return { stream, mimeType };
}

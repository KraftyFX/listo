export interface DvrOptions {
    recording : RecordingOptions,
}

export interface RecordingOptions {
    mimeType: string,
    minSegmentSize: number,
    logging: string
}

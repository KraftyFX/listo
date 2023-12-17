export async function toUint8Arrays(chunks: Blob[]) {
    const arrays: Uint8Array[] = [];

    for (let i = 0; i < chunks.length; i++) {
        arrays.push(await toUint8Array(chunks[i]));
    }
    return arrays;
}

export async function toUint8Array(blob: Blob) {
    const arr = new Uint8Array(await blob.arrayBuffer());

    return arr;
}

import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
await mkdir("artifacts/studio", { recursive: true });
const bytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const components = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};
for (const name of ["bedroom", "character"]) {
  const path = `public/models/studio/${name}.glb`,
    file = await readFile(path),
    jsonSize = file.readUInt32LE(12),
    doc = JSON.parse(file.subarray(20, 20 + jsonSize));
  if (doc.extensionsRequired?.includes("EXT_meshopt_compression")) {
    console.log(`${name}: already compressed`);
    continue;
  }
  const bin = file.subarray(28 + jsonSize);
  const chunks = [];
  let offset = 0;
  for (const [index, view] of doc.bufferViews.entries()) {
    const accessor = doc.accessors.find((a) => a.bufferView === index);
    // Sparse morph indices/values are independent views. Preserve them raw;
    // only ordinary accessor views go through the vertex/index codecs.
    if (!accessor || accessor.sparse) {
      const source = bin.subarray(
        view.byteOffset || 0,
        (view.byteOffset || 0) + view.byteLength,
      );
      const padding = (4 - (offset % 4)) % 4;
      if (padding) {
        chunks.push(Buffer.alloc(padding));
        offset += padding;
      }
      view.buffer = 0;
      view.byteOffset = offset;
      chunks.push(Buffer.from(source));
      offset += source.length;
      continue;
    }
    const stride =
      view.byteStride ||
      bytes[accessor.componentType] * components[accessor.type];
    const count = view.byteLength / stride;
    assert(Number.isInteger(count));
    const mode = view.target === 34963 ? "INDICES" : "ATTRIBUTES";
    const source = bin.subarray(
      view.byteOffset || 0,
      (view.byteOffset || 0) + view.byteLength,
    );
    const encoded = MeshoptEncoder.encodeGltfBuffer(
      source,
      count,
      stride,
      mode,
    );
    const restored = new Uint8Array(source.length);
    MeshoptDecoder.decodeGltfBuffer(restored, count, stride, encoded, mode);
    assert.deepEqual(
      Buffer.from(restored),
      source,
      "Compression must preserve every original byte",
    );
    const padding = (4 - (offset % 4)) % 4;
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      offset += padding;
    }
    view.buffer = 1;
    view.extensions = {
      ...view.extensions,
      EXT_meshopt_compression: {
        buffer: 0,
        byteOffset: offset,
        byteLength: encoded.length,
        byteStride: stride,
        count,
        mode,
      },
    };
    chunks.push(Buffer.from(encoded));
    offset += encoded.length;
  }
  doc.buffers = [
    { byteLength: offset },
    {
      byteLength: doc.buffers[0].byteLength,
      extensions: { EXT_meshopt_compression: { fallback: true } },
    },
  ];
  doc.extensionsUsed = [
    ...new Set([...(doc.extensionsUsed || []), "EXT_meshopt_compression"]),
  ];
  doc.extensionsRequired = [
    ...new Set([...(doc.extensionsRequired || []), "EXT_meshopt_compression"]),
  ];
  const text = Buffer.from(JSON.stringify(doc));
  const json = Buffer.concat([
    text,
    Buffer.alloc((4 - (text.length % 4)) % 4, 32),
  ]);
  const data = Buffer.concat([...chunks, Buffer.alloc((4 - (offset % 4)) % 4)]);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + data.length, 8);
  header.writeUInt32LE(json.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(data.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  await copyFile(path, `artifacts/studio/${name}-uncompressed.glb`);
  const result = Buffer.concat([header, json, binHeader, data]);
  await writeFile(path, result);
  console.log(
    `${name}: ${(file.length / 1e6).toFixed(2)} MB → ${(result.length / 1e6).toFixed(2)} MB; all ${doc.bufferViews.length} buffers byte-identical after decoding`,
  );
}

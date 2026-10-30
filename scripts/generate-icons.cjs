// Render through sharp/librsvg. ImageMagick's SVG renderer drops this SVG's
// gradient/clip group, producing the white-only icons previously served.
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const root = path.resolve(__dirname, "..");

async function main() {
    const source = await fs.readFile(
        path.join(root, "public/favicon.svg"),
        "utf8",
    );
    const render = (size, svg = source) =>
        sharp(Buffer.from(svg), { density: 192 })
            .resize(size, size)
            .png()
            .toBuffer();
    for (const [name, size] of [
        ["favicon-96x96.png", 96],
        ["apple-touch-icon.png", 180],
        ["icon-192.png", 192],
        ["icon-512.png", 512],
    ]) {
        await fs.writeFile(path.join(root, "public", name), await render(size));
    }
    // Maskable artwork stays within the central safe circle; its background
    // must fill the square so the OS can apply its own shape.
    await fs.writeFile(
        path.join(root, "public/icon-512-maskable.png"),
        await render(512, source.replace('rx="112"', 'rx="0"')),
    );

    // ICO supports embedded PNG frames. Include real entries for every size
    // declared in the document head, including a high-resolution fallback.
    const sizes = [16, 32, 48, 96, 256];
    const frames = await Promise.all(sizes.map((size) => render(size)));
    const header = Buffer.alloc(6 + 16 * frames.length);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(frames.length, 4);
    let offset = header.length;
    frames.forEach((frame, index) => {
        const entry = 6 + index * 16;
        header[entry] = header[entry + 1] =
            sizes[index] === 256 ? 0 : sizes[index];
        header.writeUInt16LE(1, entry + 4);
        header.writeUInt16LE(32, entry + 6);
        header.writeUInt32LE(frame.length, entry + 8);
        header.writeUInt32LE(offset, entry + 12);
        offset += frame.length;
    });
    await fs.writeFile(
        path.join(root, "public/favicon.ico"),
        Buffer.concat([header, ...frames]),
    );
    console.log(
        "Generated search, browser, Apple and PWA icons from public/favicon.svg",
    );
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

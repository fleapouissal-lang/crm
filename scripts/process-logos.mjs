import sharp from "sharp";
import fs from "fs";

function removeEdgeBackground(data, w, h, isBg) {
  const visited = new Uint8Array(w * h);
  const q = [];
  for (let x = 0; x < w; x++) {
    q.push(x, (h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    q.push(y * w, y * w + w - 1);
  }
  let qi = 0;
  while (qi < q.length) {
    const pi = q[qi++];
    if (visited[pi]) continue;
    visited[pi] = 1;
    const i = pi * 4;
    if (!isBg(data[i], data[i + 1], data[i + 2])) continue;
    data[i + 3] = 0;
    const x = pi % w;
    const y = (pi / w) | 0;
    if (x > 0) q.push(pi - 1);
    if (x < w - 1) q.push(pi + 1);
    if (y > 0) q.push(pi - w);
    if (y < h - 1) q.push(pi + w);
  }
}

async function processLogo(inPath, outPath, isBg) {
  const { data, info } = await sharp(inPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const buf = Buffer.from(data);
  removeEdgeBackground(buf, info.width, info.height, isBg);
  const png = await sharp(buf, { raw: info }).png().toBuffer();
  const trimmed = await sharp(png).trim({ threshold: 12 }).png().toBuffer();
  await sharp(trimmed).toFile(outPath);

  const meta = await sharp(outPath).metadata();
  const { data: d } = await sharp(outPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaque = 0;
  let nearBlackOpaque = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 10) {
      opaque++;
      if (d[i] < 45 && d[i + 1] < 45 && d[i + 2] < 45) nearBlackOpaque++;
    }
  }
  console.log(outPath, `${meta.width}x${meta.height}`, { opaque, nearBlackOpaque });
}

const brand = "public/brand";

if (fs.existsSync(`${brand}/fusion-leap-logo.png`)) {
  await processLogo(
    `${brand}/fusion-leap-logo.png`,
    `${brand}/fusion-leap-logo-dark.png`,
    (r, g, b) => r > 235 && g > 235 && b > 235
  );
}

await processLogo(
  `${brand}/fusion-leap-logo-light.png`,
  `${brand}/fusion-leap-logo-light.png`,
  (r, g, b) => r < 45 && g < 45 && b < 45
);

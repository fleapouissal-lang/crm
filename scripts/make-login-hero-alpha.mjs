import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = path.join(root, "public/auth/login-hand-phone-crm.png");
const output = path.join(root, "public/auth/login-hand-phone-cutout.png");

function alphaCut(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    const isCheckerboard =
      Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && min > 95 && max < 250;

    const isDarkBg =
      lum < 38 && max - min < 38 && !(r > 100 && g > 55 && b < 110);

    if (isCheckerboard || lum < 12 || isDarkBg) {
      data[i + 3] = 0;
    }
  }
}

const { data, info } = await sharp(source)
  .ensureAlpha()
  .flop()
  .raw()
  .toBuffer({ resolveWithObject: true });

alphaCut(data);

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .sharpen({ sigma: 0.7, m1: 1, m2: 0.35, x1: 2, y2: 10, y3: 16 })
  .png({ compressionLevel: 3, effort: 10 })
  .toFile(output);

const meta = await sharp(output).metadata();
const stats = await sharp(output).stats();
console.log("Created", `${meta.width}x${meta.height}`, "sharpness", stats.sharpness.toFixed(2));

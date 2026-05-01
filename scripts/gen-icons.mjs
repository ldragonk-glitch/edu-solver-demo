// 一次性: 把 public/icon.svg 转成各种 PNG 尺寸 (PWA / iOS 主屏需要)
// 用法: node scripts/gen-icons.mjs

import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const svg = readFileSync(join(PUBLIC, "icon.svg"));
const svgMaskable = readFileSync(join(PUBLIC, "icon-maskable-src.svg"));

const targets = [
  { src: svg, size: 192, file: "icon-192.png" },
  { src: svg, size: 512, file: "icon-512.png" },
  { src: svg, size: 180, file: "apple-touch-icon.png" }, // iOS 主屏标准
  { src: svg, size: 32, file: "favicon-32.png" },
  { src: svg, size: 16, file: "favicon-16.png" },
  { src: svgMaskable, size: 512, file: "icon-maskable.png" },
];

for (const { src, size, file } of targets) {
  const out = join(PUBLIC, file);
  const buf = await sharp(src).resize(size, size).png().toBuffer();
  writeFileSync(out, buf);
  console.log(`✓ ${file}  (${size}x${size}, ${buf.length} bytes)`);
}

console.log("\nDone. Icons in /public/");

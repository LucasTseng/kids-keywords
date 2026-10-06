/**
 * generate-icons.mjs
 * ---------------------------------------------------------------------------
 * 图标栅格化脚本：用 sharp 将 icons/ 下的 SVG 源图渲染成各平台所需的 PNG。
 *  - icons/icon-192.png / icon-512.png   ：PWA「any」图标
 *  - icons/icon-maskable-512.png         ：Android maskable 图标
 *  - icons/apple-touch-icon.png (180)    ：iOS 主屏幕图标
 *  - build/icon.png (1024)               ：electron-builder 源图标（自动生成 ico/icns）
 *
 * 用法：node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'icons');
const buildDir = join(root, 'build');

/** 读取 SVG 源图并缩放输出为指定尺寸的 PNG */
async function renderPng(svgName, size) {
  const svg = await readFile(join(iconsDir, svgName));
  // SVG 源图为 1024x1024，缩小属于降采样，默认密度即可保证边缘清晰
  return sharp(svg)
    .resize(size, size, { fit: 'contain' })
    .png()
    .toBuffer();
}

/** 生成任务：[源 SVG, 输出相对根目录路径, 边长] */
const tasks = [
  ['icon.svg', 'icons/icon-192.png', 192],
  ['icon.svg', 'icons/icon-512.png', 512],
  ['icon-maskable.svg', 'icons/icon-maskable-512.png', 512],
  ['icon-maskable.svg', 'icons/apple-touch-icon.png', 180],
  ['icon.svg', 'build/icon.png', 1024],
];

await mkdir(buildDir, { recursive: true });

for (const [src, rel, size] of tasks) {
  const buf = await renderPng(src, size);
  await writeFile(join(root, rel), buf);
  console.log(`生成：${rel} (${size}x${size})`);
}

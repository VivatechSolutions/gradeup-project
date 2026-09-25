const fs = require("fs");
const path = require("path");

const packageDirectory = path.dirname(require.resolve("@mediapipe/face_detection/package.json"));
const outputDirectory = path.resolve(__dirname, "../public/mediapipe/face_detection");
const assets = [
  "face_detection_short_range.tflite",
  "face_detection_short.binarypb",
  "face_detection_solution_simd_wasm_bin.data",
  "face_detection_solution_simd_wasm_bin.js",
  "face_detection_solution_simd_wasm_bin.wasm",
  "face_detection_solution_wasm_bin.js",
  "face_detection_solution_wasm_bin.wasm",
];

fs.mkdirSync(outputDirectory, { recursive: true });
for (const asset of assets) {
  fs.copyFileSync(path.join(packageDirectory, asset), path.join(outputDirectory, asset));
}
console.log(`Copied ${assets.length} local face-detection assets.`);

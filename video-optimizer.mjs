#!/usr/bin/env zx

/**
 * 背景動画用のmp4を生成する（透過なし前提）
 * - AV1(mp4)をメイン、H.264(mp4)をフォールバックとして2系統出力する
 * - ディレクトリを渡した場合は再帰的に圧縮する
 * - 音声は除去（背景動画は無音前提）
 *
 * 対応ブラウザの考え方:
 * - AV1: Chrome 70+ / Edge 121+ / Firefox 67+ / ハードウェアデコーダ搭載のSafari 17+
 * - H.264: 上記でAV1非対応の環境（古いiPhone等）を確実に拾うためのフォールバック
 *
 * インストール:
 * - brew install ffmpeg  (libsvtav1 / libx264 が有効なビルドであること)
 * - npm i
 * - node {THIS_REPOSITORY}/video-optimizer.mjs .
 *
 * @see https://github.com/google/zx
 */

import "zx/globals";

// ---- 設定 ------------------------------------------------------------------

const CONFIG = {
  // AV1 (libsvtav1): crfは小さいほど高品質。背景用途は32〜38が軽い。
  // presetは数字。小さいほど高品質・低速。6が実用的なバランス。
  av1: {
    crf: 35,
    preset: 6,
  },
  // H.264 (libx264): crfは小さいほど高品質。23が標準的。
  // presetは文字列。slowで圧縮効率を上げる。
  h264: {
    crf: 23,
    preset: "slow",
  },
};

// ---- エントリポイント -------------------------------------------------------

if (argv._.length > 0) {
  const inputPaths = argv._;
  for (const inputPath of inputPaths) {
    if (await isDirectory(inputPath)) {
      const videoFilePaths = await glob(["**/*.mp4", "**/*.mov"], {
        cwd: inputPath,
        absolute: true,
        // 自身が生成した出力は対象外にする
        ignore: ["**/*.av1.mp4", "**/*.h264.mp4"],
      });

      console.log(videoFilePaths);

      const answer = await question(
        chalk.blue(`convert ${videoFilePaths.length} files? (y/n) : `),
        {
          choices: ["y", "n"],
        },
      );

      if (answer === "y" || answer === "") {
        for (const filePath of videoFilePaths) {
          await convertVideoFile(filePath);
        }
      }
    } else {
      await convertVideoFile(inputPath);
    }
  }
} else {
  console.log(chalk.red(`Parameters are required.`));
  console.log(
    `run as : ${chalk.yellow(`video-optimizer.mjs {file|directory}`)}`,
  );
}

// ---- 変換処理 ---------------------------------------------------------------

/**
 * 1つのビデオファイルをAV1(mp4)とH.264(mp4)に変換する
 * @param {string} filePath - 変換対象のビデオファイルのパス
 */
async function convertVideoFile(filePath) {
  const pathObject = path.parse(filePath);

  const outputPaths = {
    av1: path.format({
      dir: pathObject.dir,
      name: pathObject.name,
      ext: ".av1.mp4",
    }),
    h264: path.format({
      dir: pathObject.dir,
      name: pathObject.name,
      ext: ".h264.mp4",
    }),
  };

  // --- AV1 (メイン) ---
  if (await fs.pathExists(outputPaths.av1)) {
    console.log(
      chalk.yellow(`>> SKIP: This file is already exist: ${outputPaths.av1}`),
    );
  } else {
    console.log(chalk.gray(`>> PROCESS: ${filePath} > ${outputPaths.av1}`));
    await quiet(
      $`ffmpeg -i ${filePath} \
        -c:v libsvtav1 -crf ${CONFIG.av1.crf} -preset ${CONFIG.av1.preset} \
        -svtav1-params tune=0 \
        -pix_fmt yuv420p \
        -an \
        -movflags +faststart \
        ${outputPaths.av1}`,
    );
    console.log(chalk.green(`>> SUCCESS: ${filePath} > ${outputPaths.av1}`));
  }

  // --- H.264 (フォールバック) ---
  if (await fs.pathExists(outputPaths.h264)) {
    console.log(
      chalk.yellow(`>> SKIP: This file is already exist: ${outputPaths.h264}`),
    );
  } else {
    console.log(chalk.gray(`>> PROCESS: ${filePath} > ${outputPaths.h264}`));
    await quiet(
      $`ffmpeg -i ${filePath} \
        -c:v libx264 -crf ${CONFIG.h264.crf} -preset ${CONFIG.h264.preset} \
        -pix_fmt yuv420p \
        -profile:v high -level 4.1 \
        -an \
        -movflags +faststart \
        ${outputPaths.h264}`,
    );
    console.log(chalk.green(`>> SUCCESS: ${filePath} > ${outputPaths.h264}`));
  }
}

// ---- ユーティリティ ---------------------------------------------------------

/**
 * ファイルパスがディレクトリかどうかを返す
 * @param {string} filePath - チェックするファイルパス
 * @returns {Promise<boolean>} ディレクトリの場合はtrue、ファイルの場合はfalse
 */
async function isDirectory(filePath) {
  const stats = await fs.stat(filePath);
  return stats.isDirectory();
}

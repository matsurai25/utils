#!/usr/bin/env zx

/**
 * アルファ付きの動画をアルファ付きhevc/webmに変換する
 * - ディレクトリを渡した場合は再帰的に圧縮する
 * - AfterEffectsからプリセット「アルファ付き高品質」でレンダリングしたmovファイルを想定
 *
 * インストール
 * - brew install ffmpeg
 * - npm i
 * - node {THIS_REPOSITRY}/video-optimizer.mjs .
 *
 * @see https://github.com/google/zx
 */

import "zx/globals";

if (argv._.length > 0) {
  const filePaths = argv._;
  for (const filePath of filePaths) {
    if (await isDirectory(filePath)) {
      let videoFilePaths = await glob([
        "**/*.mp4",
        "**/*.mov",
        "!**/*.hevc.mov",
      ]);
      console.log(videoFilePaths);
      const answer = await question(
        chalk.blue(`convert ${videoFilePaths.length} files? (y/n) : `),
        {
          choices: ["y", "n"],
        }
      );
      if (answer == "y" || answer === "") {
        for (const filePath of videoFilePaths) {
          await convertVideoFile(filePath);
        }
      }
    } else {
      await convertVideoFile(filePath);
    }
  }
} else {
  console.log(chalk.red(`Parameters are required.`));
  console.log(
    `run as : ${chalk.yellow(`video-optimizer.mjs {file|directory}`)}`
  );
}

async function convertVideoFile(filePath) {
  if (!(await hasAlphaChannel(filePath))) {
    console.log(
      chalk.red(`>> SKIP: This file has not alpha channel: ${filePath}`)
    );
    return;
  }

  const pathObject = path.parse(filePath);
  const outputPaths = {
    mov: path.format({
      dir: pathObject.dir,
      name: pathObject.name,
      ext: ".hevc.mov",
    }),
    webm: path.format({
      dir: pathObject.dir,
      name: pathObject.name,
      ext: ".vp9.webm",
    }),
  };
  if (await fs.pathExistsSync(outputPaths.mov)) {
    console.log(
      chalk.yellow(`>> SKIP: This file is already exist: ${outputPaths.mov}`)
    );
  } else {
    console.log(chalk.gray(`>> PROCESS: ${filePath} > ${outputPaths.mov}`));
    await quiet(
      $`avconvert --preset PresetHEVC1920x1080WithAlpha --source ${filePath} --output ${outputPaths.mov}`
    );
    console.log(chalk.green(`>> SUCCESS: ${filePath} > ${outputPaths.mov}`));
  }
  if (await fs.pathExistsSync(outputPaths.webm)) {
    console.log(
      chalk.yellow(`>> SKIP: This file is already exist: ${outputPaths.webm}`)
    );
  } else {
    console.log(chalk.gray(`>> PROCESS: ${filePath} > ${outputPaths.webm}`));
    await quiet(
      $`ffmpeg -i ${filePath} -c:a copy -c:v libvpx-vp9 ${outputPaths.webm}`
    );
    console.log(chalk.green(`>> SUCCESS: ${filePath} > ${outputPaths.webm}`));
  }
}

/**
 * 指定されたビデオファイルにalphaチャンネルが存在するかどうかを判定する関数
 * @param {string} filePath - 判定対象とするビデオファイルのパス
 * @returns {Promise<boolean>} - alphaチャンネルがある場合はtrue、ない場合はfalseを返す
 */
async function hasAlphaChannel(filePath) {
  const pix_fmt = await quiet(
    $`ffprobe -v 0 -select_streams v:0 -show_entries stream=pix_fmt -of compact=p=0:nk=1 ${filePath}`
  );
  const res = await quiet(
    $`ffprobe -v 0 -show_entries pixel_format=name:flags=alpha -of compact=p=0  | grep ${pix_fmt.stdout.replace(
      "\n",
      "|"
    )}`
  );
  return !!Number(res.stdout.match(/alpha=(\d)/)[1]);
}

/**
 * ファイルパスがディレクトリかどうかを返す
 * @param {string} filePath - チェックするファイルパス
 * @returns {Promise<boolean>} ディレクトリの場合はtrue、ファイルの場合はfalse
 */
async function isDirectory(filePath) {
  const stats = await fs.statSync(filePath);
  return stats.isDirectory();
}

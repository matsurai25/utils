#!/usr/bin/env zx

/**
 * 画像をwebpに圧縮する
 * - ディレクトリを渡した場合は再帰的に圧縮する
 *
 * オプション
 * - -q 変換のクオリティを指定。未指定の場合は90で変換
 * - --force-update 既に同名のwebpファイルがある場合、スキップせず上書きする
 *
 * インストール
 * - brew install imagemagick
 * - npm i
 * - node {THIS_REPOSITRY}/image-resizer.mjs . --sizes 2880,1440,800
 *
 * @see https://github.com/google/zx
 */

import "zx/globals";

const sizes = [...`${argv.sizes},`.split(",").filter((s) => s)];

if (argv._.length > 0 && sizes.length) {
  const filePaths = argv._;
  for (const filePath of filePaths) {
    if (await isDirectorySync(filePath)) {
      let imageFilePaths = await glob([
        "**/*.png",
        "**/*.jpg",
        "**/*.jpeg",
        "!**/*.w*.*",
      ]);
      console.log(imageFilePaths);
      const answer = await question(
        chalk.blue(`convert ${imageFilePaths.length} files? (y/n) : `),
        {
          choices: ["y", "n"],
        }
      );
      if (answer == "y" || answer === "") {
        for (const filePath of imageFilePaths) {
          await convertImageFile(filePath);
        }
      }
    } else {
      await convertImageFile(filePath);
    }
  }
  console.log(chalk.green(`>> COMPLETE`));
} else {
  console.log(chalk.red(`Parameters are required.`));
  console.log(
    `run as : ${chalk.yellow(
      `image-optimizer.mjs {file|directory} --size 2880,1440`
    )}`
  );
}

async function convertImageFile(filePath) {
  const originalWidth = (
    await quiet($`identify -format "%[width]" ${filePath}`)
  ).stdout;
  const pathObject = path.parse(filePath);

  console.log(chalk.gray(`>> PROCESS: ${filePath}`));
  for (const size of sizes) {
    const outputPath = path.format({
      dir: pathObject.dir,
      name: pathObject.name + `.w${size}`,
      ext: pathObject.ext,
    });

    if (Number(originalWidth) < Number(size)) {
      console.log(
        chalk.yellow(`>> NOTICE`) +
          `: original file must be larger than target size. originalSize:${originalWidth} targetSize:${size}`
      );
      continue;
    }

    await quiet($`convert ${filePath} -resize ${size}x ${outputPath}`);
    console.log(chalk.green(`>> SUCCESS`) + `: ${outputPath}`);
  }
}

/**
 * ファイルパスがディレクトリかどうかを返す
 * @param {string} filePath - チェックするファイルパス
 * @returns {Promise<boolean>} ディレクトリの場合はtrue、ファイルの場合はfalse
 */
async function isDirectorySync(filePath) {
  const stats = await fs.statSync(filePath);
  return stats.isDirectory();
}

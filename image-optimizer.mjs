#!/usr/bin/env zx

/**
 * 画像をwebpに圧縮する
 * - ディレクトリを渡した場合は再帰的に圧縮する
 *
 * オプション
 * - -q 変換のクオリティを指定。未指定の場合は90で変換
 * - --force-update 既に同名のwebpファイルがある場合、スキップせず上書きする
 * - --delete ファイルを削除する
 *
 * インストール
 * - brew install webp
 * - npm i
 * - node {THIS_REPOSITRY}/image-optimizer.mjs .
 *
 * @see https://github.com/google/zx
 */

import "zx/globals";
import byteSize from "byte-size";

const quality = argv.q || 90;

let beforeSizeTotal = 0;
let afterSizeTotal = 0;

if (argv._.length > 0) {
  const filePaths = argv._;
  for (const filePath of filePaths) {
    if (await isDirectorySync(filePath)) {
      let imageFilePaths = await glob(["**/*.png", "**/*.jpg", "**/*.jpeg"]);
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
        if (argv["delete"]) {
          await quiet($`find . -type f -name "*.png" -delete`);
          await quiet($`find . -type f -name "*.jp*g" -delete`);
          console.log(chalk.green(`>> SUCCESS: DELETE png/jpg files`));
        }
      }
    } else {
      await convertImageFile(filePath);
    }
  }
  console.log(
    chalk.green(`>> COMPLETE: `) +
      chalk.gray(
        `${byteSize(beforeSizeTotal)} >>> ${byteSize(afterSizeTotal)} `
      ) +
      chalk.blue(
        "↓" + (100 - Math.round((afterSizeTotal / beforeSizeTotal) * 100)) + "%"
      )
  );
} else {
  console.log(chalk.red(`Parameters are required.`));
  console.log(
    `run as : ${chalk.yellow(`image-optimizer.mjs {file|directory}`)}`
  );
}

async function convertImageFile(filePath) {
  const pathObject = path.parse(filePath);
  const outputPath = path.format({
    dir: pathObject.dir,
    name: pathObject.name,
    ext: ".webp",
  });

  if (!argv["force-update"] && (await fs.pathExistsSync(outputPath))) {
    console.log(
      chalk.yellow(`>> SKIP: This file is already exist: ${outputPath}`)
    );
    return;
  }

  const statBefore = fs.statSync(filePath);
  console.log(
    chalk.gray(`>> PROCESS: ${filePath}  (${byteSize(statBefore.size)})`)
  );
  await quiet($`cwebp -q ${quality} ${filePath} -o ${outputPath}`);
  const statAfter = fs.statSync(outputPath);
  console.log(
    chalk.green(`>> SUCCESS`) +
      `: ${outputPath} ` +
      chalk.green(`(${byteSize(statAfter.size)}) `) +
      chalk.blue(
        "↓" + (100 - Math.round((statAfter.size / statBefore.size) * 100)) + "%"
      )
  );

  beforeSizeTotal += statBefore.size;
  afterSizeTotal += statAfter.size;
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

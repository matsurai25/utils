#!/usr/bin/env zx

/**
 * rsyncを使用したバックアップスクリプト
 * - 指定したローカルディレクトリをリモートディレクトリへ同期する
 * - 不要なファイルやフォルダを除外できる
 *
 * オプション
 * - -u バックアップ先のユーザー名（必須）
 * - -h バックアップ先のホスト名（必須）
 * - {local_dir} バックアップ元のディレクトリ（必須）
 * - {remote_dir} バックアップ先のディレクトリ（必須）
 * - --dry-run 実際に転送せずにシミュレーションを行う
 *
 * 除外ファイルリスト
 * - `.rsync-exclude` に記載されたファイル・フォルダを除外
 *   （スクリプトと同じディレクトリの `.rsync-exclude` を参照）
 *
 * インストール
 * - brew install rsync
 * - npm i
 * - node backup.mjs -u <user> -h <host> <local_dir> <remote_dir> [--dry-run]
 *
 * @see https://github.com/google/zx
 */

import "zx/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import notifier from "node-notifier";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const EXCLUDE_FILE = path.join(scriptDir, ".rsync-exclude");

const logInfo = (msg) => console.log(chalk.blue(msg));
const logError = (msg) => console.error(chalk.red(msg));
const logSuccess = (msg) => console.log(chalk.green(msg));

// 引数チェック
if (!argv.u || !argv.h || argv._.length !== 2) {
  logError("Missing required parameters.");
  console.log(
    `Usage: ${chalk.yellow(
      "node backup.mjs -u <user> -h <host> <local_dir> <remote_dir> [--dry-run]"
    )}`
  );
  process.exit(1);
}

const NAS_USER = argv.u;
const NAS_HOST = argv.h;
const [SOURCE_DIR, NAS_PATH] = argv._;
const DRY_RUN = argv["dry-run"] ? "--dry-run" : "";

// `.rsync-exclude` をスクリプトのディレクトリから参照
if (!fs.existsSync(EXCLUDE_FILE)) {
  logError(`Exclude file not found: ${EXCLUDE_FILE}`);
  process.exit(1);
}

if (DRY_RUN) {
  logInfo("Dry run mode enabled. No files will be transferred.");
}

logInfo(
  `Starting rsync backup from ${SOURCE_DIR} to ${NAS_USER}@${NAS_HOST}:${NAS_PATH}...`
);

try {
  await $`rsync -avh ${DRY_RUN} --exclude-from=${EXCLUDE_FILE} --info=progress2 ${SOURCE_DIR} ${NAS_USER}@${NAS_HOST}:${NAS_PATH}`;

  if (DRY_RUN) {
    logSuccess("Dry run completed successfully!");
    notifier.notify(`Dry run completed successfully!: ${SOURCE_DIR}`);
  } else {
    logSuccess("Backup completed successfully!");
    notifier.notify(`Backup completed successfully!: ${SOURCE_DIR}`);
  }
} catch (error) {
  logError("Backup failed.");
  process.exit(1);
}

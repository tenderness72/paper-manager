# Paper Manager

Windows 向けの Electron 論文管理アプリです。Next.js / React の画面と Prisma / SQLite の API をローカルで動かし、論文情報と PDF を自分の PC に保存します。クラウド同期やアカウントは不要です。

## 機能

- 論文の登録・編集・削除（タイトル、著者、ジャーナル、年、要約）
- RIS ファイルの一括インポート
- PDF の添付・差し替え・解除、ドラッグ & ドロップ、アプリ内での表示
- タイトル・著者・ジャーナル・要約を対象とした検索
- アプリを開いている間の読書リマインダー

RIS はファイルと任意の PDF を選び、「RIS をインポート」を押します。複数論文に添付した同じ PDF は共有され、最後の参照を削除したときだけファイルを削除します。PDF は 50 MB 以下で、保存時にアップロードされます。保存に失敗した場合は未使用のアップロードを削除します。アプリが保存途中に強制終了した場合は未参照ファイルが残ることがあります。

## 開発

Node.js 24 以上と npm が必要です。Windows 配布版の利用者には Node.js のインストールは不要です。

```sh
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。`npm run dev` は起動前に `.data/paper-manager.db` と PDF 保存ディレクトリを初期化します。既存 DB の論文は上書きしません。

Electron の開発画面は次で起動します（開発サーバーも同時に起動します）。

```sh
npm run electron:dev
```

## ビルド・テスト

Windows x64 上で実行してください。

```sh
npm run lint
npm test
npm run build
npm run test:smoke
npm run electron:build
```

`npm run electron:build` は Next.js の production build と NSIS インストーラー作成を実行します。生成物は `dist/Paper Manager Setup 0.1.0.exe`、展開されたアプリは `dist/win-unpacked/` に出力します。インストーラーを作らず配布内容だけを確認する場合は `npm run electron:pack` を使います。

`npm test` は初回 DB 初期化、再起動時のデータ保持、壊れた DB の保護、RIS 解析、既存データ移行を検証します。`npm run test:smoke` はビルド済み standalone サーバーを一時 DB で起動し、ページ・静的ファイル、CRUD、検索、RIS 一括登録、PDF 配信・共有・差し替え・削除、入力エラーを検証します。

`.github/workflows/windows.yml` でも Windows 上のインストーラー生成と検証を実行します。Linux で Windows NSIS を生成するには Wine が必要です。未署名の開発ビルドには Windows の警告が表示される場合があります。署名証明書・独自アプリアイコンはこのリポジトリには含めていません。

## データ保存先

| 実行方法 | SQLite | PDF |
| --- | --- | --- |
| 開発用 Next.js / Electron | `<checkout>/.data/paper-manager.db` | `<checkout>/.data/uploads/pdfs/` |
| Windows 配布版 | `%APPDATA%/Paper Manager/paper-manager.db` | `%APPDATA%/Paper Manager/uploads/pdfs/` |

配布版は初期化した保存先を `app.getPath('userData')` に設定します。旧版の `%APPDATA%/paper-manager/paper-manager.db` があり、新保存先に DB がない場合は旧ディレクトリを継続使用します（両方ある場合は `Paper Manager` 側を優先し、結合しません）。OS の設定により実際の保存場所は異なる場合があります。アプリ更新時も既存の DB を維持します。バックアップにはアプリを終了してから保存ディレクトリ全体をコピーしてください。

開発・単独 Next.js 起動時は `PAPER_MANAGER_DATA_DIR` で保存ディレクトリを変更できます。`DATABASE_URL` を指定する場合は SQLite ファイルを用意してください。`npm run data:init` は `PAPER_MANAGER_DATA_DIR` 内の `paper-manager.db` を初期化します。任意の `DATABASE_URL` の DB は初期化しません。

PDF の DB 値は絶対パスではなく `/uploads/pdfs/<filename>.pdf` です。専用のサーバールートが保存ディレクトリから配信するため、インストール場所の変更にも影響されません。`resources` は読み取り専用の配布ファイルとして扱い、DB・PDF を書き込みません。

## 既存データの移行

従来の `prisma/dev.db` や `public/uploads/pdfs` の内容は、自動的に新規ユーザーへ配布しません。Git の追跡対象から外していますが、既存チェックアウト内のファイルを削除する変更ではありません。過去の Git 履歴にある DB は、この変更だけでは削除されません。

従来の配布版で既に `%APPDATA%/Paper Manager/paper-manager.db` に保存された論文は、その DB をそのまま使用できます。旧 `resources/standalone/public/uploads/pdfs`（旧配置によっては `resources/public/uploads/pdfs`）に PDF がある場合は、アプリを終了し、バックアップ後に同じファイル名で `userData/uploads/pdfs` へコピーしてください。DB 内の URL は変更不要です。

開発用 DB を新しい保存場所へ移す場合は、アプリを終了・バックアップしてから、Node.js 24 上で次を実行します。

```sh
node scripts/import-legacy.cjs prisma/dev.db public/uploads/pdfs .data
```

第 3 引数には**存在しない、または空の保存ディレクトリ**を指定します。既に `.data` にデータがある場合は別の空ディレクトリへ移行して `PAPER_MANAGER_DATA_DIR` を指定してください。Windows 配布版へ移す場合も初回起動前にその `userData` ディレクトリを指定します。

このコマンドは SQLite の backup API で DB を複製し、DB が参照する PDF をコピーします。元 DB と元 PDF を変更せず、移行先に既存ファイルがあれば上書きしません。参照 PDF が欠けている場合は移行を止めます。紛失した PDF を元に戻すか、元アプリで添付を解除してから再実行してください。

## 配布構成

- `resources/app.asar`: Electron のメインプロセスと DB 初期化コード
- `resources/standalone/server.js`: Electron 内蔵 Node で動く Next.js サーバー
- `resources/standalone/.next/static` と `resources/standalone/public`: UI の静的ファイル
- `resources/standalone/node_modules/.prisma/client`: Prisma クライアントと Windows エンジン
- `resources/prisma/migrations`: 初回 DB 作成に使用する SQL

Electron はローカルサーバーの `/api/papers` が成功してから画面を開きます。起動失敗はダイアログで通知します。アプリ終了時にサーバーも終了し、二重起動は既存ウィンドウに戻します。

## 今後の拡張

未読 / 読書中 / 読了、タグ、DOI フィールド・DOI による書誌情報取得は未実装です。これらを追加する際には既存 DB を保持するスキーマ移行が必要です。外部書誌サービスへの接続処理はローカルの論文登録処理と分けて追加してください。

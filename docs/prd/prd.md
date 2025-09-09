# 構想

ObsidianのノートをVS Codeで書けるように、拡張機能版のObsidianを自家開発したい
    - インストールバリアに引っかからないように最小構成のExtension
    - Vaultの読み書き
    - ノートリンク機能
    - DailyNote作成機能
    - Markdownプレビュー
    - タイムスタンプ機能
    - ToDo管理
# 概要
VisualStudio Codeでインストール可能なObsidianVault操作用拡張機能
# 目的
Obsidianが使えない環境でも、VS Code上で「Obsidianの基本体験の一部」を再現する。

# MVPでやること

- Markdownのパース＆シンプル描画（太字、チェックリスト、リンク、Wikiリンク[[...]]）

- Wikiリンクの追跡（エディタ内でクリック/ショートカットでジャンプ）

- [[...]]編集中にCtrl+Enter（macはCmd+Enter）で新規ノート自動作成→新規タブで開く

- ショートカットで日付/時刻を挿入

# 非MVP（後回し）

- グラフ表示、プラグイン互換、モバイル同期、複雑なObsidianプラグインAPI互換

# 対応プラットフォーム

VS Code Desktop（Win/Mac/Linux）。Remote/WSL/Dev Containersでもworkspace.fsで動く設計。Web版は非対応（後で検討）。

# 主要機能設計（拡張ポイント）

DocumentLinkProvider：[[...]]をリンク化（クリックで開く/作る） 

コマンド：

- obsd.openOrCreateWikiLink（Wikiリンクへ移動/作成）

- obsd.insertDate / obsd.insertTime（挿入）

- obsd.preview（Webviewで軽量プレビュー） 

- キー操作：Ctrl/Cmd+Enterは**「カーソルがWikiリンク内」**のときだけ有効（独自コンテキストobsd.inWikiLinkで制御）。

- ファイル操作：workspace.fsでノート作成・読み書き（RemoteでもOK）。

- Markdownパース：markdown-it + Wikiリンク用プラグイン（@ig3/markdown-it-wikilinks）をWebview描画に利用。

# 設定（例）

- obsd.vaultRoot（Vaultのルート/既定はワークスペース）

- obsd.noteExtension（既定.md）

- obsd.slugStrategy（passthrough|kebab-case|snake_case）

- obsd.dateFormat / obsd.timeFormat（YYYY-MM-DD / HH:mm）

- obsd.template（新規ノート1行目テンプレ）

# UXの要点

- [[Page|表示名]]や[[Page#Heading]]も解釈。未存在なら作成ダイアログなしで即作成→開く。

- プレビューは軽量：太字/リンク/チェックリストだけ。クリックでエディタ位置へジャンプ。

- エディタ内リンクはCommand URIでも起動可能（必要に応じて）。

# 受け入れ基準（DoD）

- Wikiリンク作成：[[New Note]]上でCtrl/Cmd+Enter → <vaultRoot>/New Note.mdが作成され、エディタで開く。

- Wikiリンク移動：既存[[Existing]]をクリック or Ctrl/Cmd+Enter → 対応ファイルにジャンプ。

- 別名/見出し：[[Page|表示名]]や[[Page#Heading]]も正しく解決する。

- 日付/時刻：Alt+D / Alt+Tでカーソル位置にフォーマット通り挿入。

- プレビュー：太字、チェックリスト、標準リンク、[[...]]を描画できる。

- Remote/WSL：同一コードで動く（workspace.fs経由）。
# VIDEO MARKETPLACE Progress Log

## CURRENT RESUME POINT — 2026-09-10

**現在の作業基準点は `3317eceff56c6b98d058a5b46e119d65ee2ccce4`。ホームページと完成済み子ページは作り直さない。今回もCI失敗の原因箇所だけを修正し、重複作業を避ける。**

### 1. 現在のコード基準点
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- **Latest code commit: `3317eceff56c6b98d058a5b46e119d65ee2ccce4`**
- `3317ece` の変更内容: Browser UI Acceptance の残存する不安定なテキスト依存セレクタを、URL/リンク構造に基づくセレクタへ修正。
  - Library: `a[href="/pages/watch.html"]` を使用。
  - Login: `a[href="/pages/register.html"]`、`a[href="/pages/login.html"]` を使用。
- 直前 `c8f1480` では Product Detail → Checkout、Account → Orders/Login のセレクタを修正済み。

### 2. 今回確認したCI失敗
- Browser UI Acceptance run `34423176037` / job `102702790433`: **FAILURE**。
- Buyer browser acceptance: **4 passed**。
- Browser module smoke: **1 passed**。
- Showcase navigationで残った失敗は2件。
  1. Libraryの「視聴する」が2件存在し、`getByText('視聴する', { exact: true })` がstrict mode violation。
  2. Loginの「新規/登録」テキスト検索が対象要素を取得できず30秒timeout。
- 失敗原因は画面機能の再設計ではなく、テストが表示文言に依存していたこと。

### 3. 今回実施した修正
- `tests/browser-showcase-navigation.spec.js` のみを修正。
- Libraryの視聴導線を `a[href="/pages/watch.html"]` に変更。
- Login → Registerを `a[href="/pages/register.html"]` に変更。
- Register → Loginを `a[href="/pages/login.html"]` に変更。
- **Homepage / Screen #2–#9 のHTML/CSS本体は変更していない。**

### 4. 次の作業
1. **`3317ece` に対する新しいBrowser UI Acceptanceの結果を確認する。**
2. 失敗なら、失敗したstep/logの原因箇所だけ修正する。
3. 成功なら、同じテスト修正を繰り返さず、残作業の一本道へ進む。
4. 最新コミットでCIが必要な状態になったら、Render auto-deployの実状態も確認する。

### 5. 完成・変更しない範囲
- Homepage / Screen #1: FROZEN。
- Screen #2 Video list/search: completed。
- Screen #3 Product detail: completed。
- Screen #4 Checkout: completed。
- Screen #5 Library: completed。
- Screen #6 Watch: completed。
- Screen #7 Creator Studio: completed。
- Screen #8 Admin: completed。
- Screen #9 Common pages: completed。
- 既存の主要システムフローを作り直さない。
- 同じCI修正を繰り返さない。

### 6. 商用デモ境界
- 現在は販売用ショーケースデモ。
- 実決済、実認証情報保存、実メディアダウンロード、production credentialsはまだ接続しない。
- 本番化工程はCI/デモ監査が安定してから進める。

### 7. 残作業の優先順位
CI安定化 → デモ全体の最終監査 → 必要なビジュアルポリッシュ → 顧客向けブランド差し替え性 → Legal/Privacy → 本番決済・ストレージ・認証 → hosting/backup/monitoring → 最終CI → 販売パッケージ確定。

### 8. 絶対にやらないこと
- 完成済みHomepage/Screen #2–#9を理由なく作り直さない。
- 根拠なく「完成」「CI成功」と言わない。
- CI待ちのためだけに意味のないコミットを作らない。
- Render auto-deploy有効時に手動deployを重ねない。
- 同じ作業を繰り返さない。
- スクリーンショットを要求して済ませない。GitHub/Renderで確認できるものは先に確認する。

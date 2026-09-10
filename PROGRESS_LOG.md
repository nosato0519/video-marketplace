# VIDEO MARKETPLACE Progress Log

## CURRENT RESUME POINT — 2026-09-10

**現在の作業基準点は `eadcdaa72b914c4be2ccc7e0f1f405586499a672`。Legal / Privacy配信回帰を解消済み。顧客向けブランド差し替え性の監査を進め、ブランド処理を原因とするブラウザ受入テスト回帰を特定・最小修正済み。現在は修正後CIの再確認待ち。ホームページと完成済み子ページは作り直さない。重複作業を避ける。**

### 1. 現在のコード基準点
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- **Latest code commit: `eadcdaa72b914c4be2ccc7e0f1f405586499a672`**
- 顧客向けブランド設定:
  - `app/index.html` の `video-marketplace-brand` metaを変更点として使用。
  - `app/branding.js` が動的に生成されるUIへブランド名を適用。
  - 旧 `VIDORA` と既定値 `VIDEO MARKETPLACE` の両方を顧客ブランドへ置換。
  - ブランド置換結果が元テキストと異なる場合だけDOMを書き換えるようにし、MutationObserverの自己発火ループを防止。
  - `BRANDING.md` に顧客引き渡し手順を明記。

### 2. 直近CI回帰と修正
- `908735017d7e0ada7cdbd54846109ef476ea2df2` の Browser UI Acceptance で buyer browser acceptance が4件とも `page.goto()` の30秒タイムアウトで失敗。
- 失敗対象は `/app/index.html#/library`、`#/product/demo-1`、`#/watch/demo-1` など複数ルートに共通していたため、個別画面の不具合ではなくアプリ起動時の共通処理を調査。
- `app/index.html` から `branding.js` を先に読み込み、`main.js` が描画したDOMをMutationObserverで監視している構造を確認。
- `branding.js` が同じ文字列へ置換した場合にも `nodeValue` を再設定するため、MutationObserverが自己発火し続ける可能性を特定。
- `eadcdaa72b914c4be2ccc7e0f1f405586499a672` で、置換後の値が元値と異なる場合だけDOMを書き換える最小修正を反映。
- 既存ページやテストコードは変更していない。

### 3. Legal / Privacy
- `demo/pages/legal.html` — 利用規約・特商法表示のデモ用テンプレート。
- `demo/pages/privacy.html` — プライバシーポリシーのデモ用テンプレート。
- `demo/navigation-e2e.mjs` — Legal / PrivacyのHTTPルートを検証。
- `demo/link-fix-proxy.mjs` — Legal / Privacyをshowcase proxyから直接配信。
- Legal / Privacyは実運用時に顧客固有の事業者情報、連絡先、外部サービス、販売条件等へ差し替える前提。

### 4. 次の作業
1. **`eadcdaa...` に対する全CIの完了確認**。
2. 失敗があれば失敗箇所だけを最小修正する。
3. CIが全面成功したら、デモ最終監査をクローズする。
4. Renderはauto-deploy前提で、GitHub変更後の実状態だけ確認する。手動deployは行わない。

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
- 既存の主要システムフローを理由なく作り直さない。
- 同じCI修正を繰り返さない。

### 6. 商用デモ境界
- 現在は販売用ショーケースデモ。
- 実決済、実認証情報保存、実メディアダウンロード、production credentialsはまだ接続しない。
- 本番化工程はデモ監査が安定してから進める。

### 7. 残作業の優先順位
**CI安定化（完了） → Legal / Privacy配信回帰（完了） → 顧客向けブランド差し替え性（実装・回帰修正済み、CI再確認中） → デモ最終監査クローズ → 必要なビジュアルポリッシュ → 本番決済・ストレージ・認証 → hosting/backup/monitoring → 最終CI → 販売パッケージ確定。**

### 8. 絶対にやらないこと
- 完成済みHomepage/Screen #2–#9を理由なく作り直さない。
- 根拠なく「完成」「CI成功」と言わない。
- CI待ちのためだけに意味のないコミットを作らない。
- Render auto-deploy有効時に手動deployを重ねない。
- 同じ作業を繰り返さない。
- スクリーンショットを要求して済ませない。GitHub/Renderで確認できるものは先に確認する。

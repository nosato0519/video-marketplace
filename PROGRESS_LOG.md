# VIDEO MARKETPLACE Progress Log

## CURRENT RESUME POINT — 2026-09-10

**現在の作業基準点は `2c2d687cc742cd6f3e5eccfb787370a22e693e86`。Legal / Privacy配信回帰を解消済み。顧客向けブランド差し替え性の監査を完了し、ブランド名を本番アプリの設定値から動的UIへ適用する処理まで反映済み。現在はこの変更に対するCI回帰確認中。ホームページと完成済み子ページは作り直さない。重複作業を避ける。**

### 1. 現在のコード基準点
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- **Latest code commit: `2c2d687cc742cd6f3e5eccfb787370a22e693e86`**
- 顧客向けブランド設定:
  - `app/index.html` の `video-marketplace-brand` metaを変更点として使用。
  - `app/branding.js` が動的に生成されるUIへブランド名を適用。
  - 旧 `VIDORA` と既定値 `VIDEO MARKETPLACE` の両方を顧客ブランドへ置換。
  - `BRANDING.md` に顧客引き渡し手順を明記。
- Legal / Privacy:
  - `demo/pages/legal.html` — 利用規約・特商法表示のデモ用テンプレート。
  - `demo/pages/privacy.html` — プライバシーポリシーのデモ用テンプレート。
  - `demo/navigation-e2e.mjs` — Legal / PrivacyのHTTPルートを検証。
  - `demo/link-fix-proxy.mjs` — Legal / Privacyをshowcase proxyから直接配信。
- Legal / Privacyは実運用時に顧客固有の事業者情報、連絡先、外部サービス、販売条件等へ差し替える前提。
- 既存の商品画面・UI本体の再設計はしていない。

### 2. CI確認結果
- Legal / Privacy追加後のFunctional / Browser E2Eは成功済み。
- 以前のnavigation-e2eプロセス終了不具合は `f342a775` で解消済み。
- ブランド処理の最新コード `2c2d687...` に対して、2026-09-10 02:34 UTC時点で以下のCIが実行中/待機中:
  - Payment Regression `34429987807`: in_progress
  - Release Package Check `34429987542`: in_progress
  - Clean Install `34429987582`: in_progress
  - Browser UI Acceptance `34429987545`: in_progress
  - Backend Browser Acceptance `34429987567`: queued
  - Browser E2E `34429987571`: queued
- 最新CIについては、完了するまで成功とは扱わない。

### 3. 今回の最終デモ監査
- 商用パッケージ文書を確認。
- デモは販売用ショーケースであり、本番の決済・認証情報・本番メディア・production credentialsとは分離されている。
- Legal / Privacyが商用チェックリスト上の未完了項目だったため、デモ内ページとして追加。
- 新規2ページをNavigation E2EでHTTPルート確認対象へ追加。
- 最初のLegal / Privacy実装後、showcase proxy側が2ページを配信しておらず404になる回帰を確認。`9a5e8c6` で最小修正し、Functional / Browser E2Eの成功を確認。
- 本番アプリ側のブランド名が `main.js` に直接ハードコードされていることを確認。`branding.js` を拡張し、旧 `VIDORA` だけでなく既定ブランド `VIDEO MARKETPLACE` も顧客ブランドへ置換できる状態にした。
- 顧客固有のロゴ、サポート連絡先、Legal / Privacy本文は顧客納品時に差し替える項目として明文化。勝手な連絡先は設定しない。

### 4. 次の作業
1. **最新ブランド変更に対する全CIの完了確認**。
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
**CI安定化（完了） → Legal / Privacy配信回帰（完了） → 顧客向けブランド差し替え性（実装完了・CI確認中） → デモ最終監査クローズ → 必要なビジュアルポリッシュ → 本番決済・ストレージ・認証 → hosting/backup/monitoring → 最終CI → 販売パッケージ確定。**

### 8. 絶対にやらないこと
- 完成済みHomepage/Screen #2–#9を理由なく作り直さない。
- 根拠なく「完成」「CI成功」と言わない。
- CI待ちのためだけに意味のないコミットを作らない。
- Render auto-deploy有効時に手動deployを重ねない。
- 同じ作業を繰り返さない。
- スクリーンショットを要求して済ませない。GitHub/Renderで確認できるものは先に確認する。

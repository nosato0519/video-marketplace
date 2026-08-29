# Video Marketplace — Commerce作業進捗・再開チェックポイント

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`

## 現在地点
- 作業ブランチ: `feat/seller-application-main-integration`
- 最新作業コミット: `dc9ae01d678ff860f05b6f4154740e3058c4d4fb`
- Browser Acceptance #19 / `33239569178`: FAIL
- Browser #19原因: ホームロード直後に `#app` の可視性を確認したが、SPAのmodule初期化完了前に空の `#app` を可視性判定してtimeoutした。
- 調査: `app/main.js` はトップページで `renderHome()` を実行し、`#app.innerHTML` を設定する実装。CIではAPI/backend/proxyとも正常起動している。
- 対応: PlaywrightをDOM rootの可視性に依存させず、実際の `.site-header` が描画されたことを待ってから `Sign up` をクリックする方式へ変更。
- Backend Regression #571: PASS
- Clean Install #154: PASS
- Seller Application Acceptance #2: PASS
- 現在: Browser Acceptance #19の原因修正コミットを作成済み。新CI Runの結果待ち。

## 今回の実装
- Seller Application DB migration
- buyer向け申請API
- admin審査API
- app.jsへのroute接続
- HTTP acceptance script
- Seller Application Acceptance workflow
- workflow push対象に `feat/seller-application-main-integration` と `main` を明示
- CI frontend proxy (`scripts/ci-frontend-proxy.mjs`)
- Playwright real-backend Seller Application browser acceptance (`tests/browser-backend-seller-application.spec.js`)
- Backend Browser Acceptance workflow (`.github/workflows/backend-browser-acceptance.yml`)
- `app/main.js` の `/seller/register` Seller Application画面接続

## Seller Applicationの検証対象
- buyerだけ申請可能
- display/legal name必須
- country code 2文字検証
- active application重複防止
- buyerからseller-only endpointへのアクセス拒否
- adminのみ審査可能
- pending → under_review → approved/rejectedの状態遷移制御
- reject時review note必須
- approve時users.roleをsellerへ変更
- approve時seller_profiles作成/更新
- review操作をaudit_eventsへ記録

## 確定PASS
- Seller Application Acceptance #2: PASS
- Backend Regression #571: PASS
- Clean Install #154: PASS
- Core 187/187 PASS
- Payment / Purchase / Seller Earnings / Payout / Media系PASS

## Browser Acceptance履歴
- #15 / `33239035283`: FAIL。初期selector不一致。
- #16: FAIL。修正後も現行register画面との不一致。
- #17 / `33239306143`: FAIL。実行対象と修正コミットの不整合を確認。
- #18 / `33239412922`: FAIL。`#auth-form` をハッシュURL直行後に待つ方式が現行SPA実行順と噛み合わずtimeout。
- #19 / `33239569178`: FAIL。`#app` 可視性チェックがSPA module初期化前に実行されtimeout。

### #19の調査結果
- CIログでPostgreSQL、migration 26件、Backend、health check、frontend proxyはすべて正常。
- Playwright本体は `page.goto(appUrl)` 後の `expect(page.locator('#app')).toBeVisible()` で停止。
- DOM上の `#app` は存在するが空のためvisible判定に失敗した。
- `app/main.js` のトップルートは `renderHome()` で `#app.innerHTML` を設定するため、テストは実DOM描画完了を待つ必要がある。

## 最新テスト修正
コミット:
`dc9ae01d678ff860f05b6f4154740e3058c4d4fb`

変更:
- `#app` の可視性アサーションを削除。
- `.site-header` の可視性を待つ。
- その後、実際の `Sign up` リンクをクリック。
- `#/register`遷移後に `#auth-form` を確認して入力。
- Seller Application以降の実Backend検証は維持。

## 残作業（優先順）
1. `dc9ae01...` を対象とする修正版Backend Browser Acceptance CIの実Run発生・PASS確認。
2. PASSならBrowser Smoke / module smokeの必要部分を安全に移植・検証。
3. Postgres Acceptanceでseller application migration/APIを最新統合状態で確認。
4. Security Regressionを最新統合状態で確認。
5. Commerce/Media全CIを最新統合状態で再確認。
6. 最新mainとの差分を再確認し、main統合前のレビュー。
7. 最終セキュリティレビュー。
8. 全CIと最終条件がPASSするまで完成判定しない。

## 再開手順
1. このファイルを最初に読む。
2. `feat/seller-application-main-integration` のHEADを確認。
3. 最新Browser Acceptance runを確認し、対象コミットがHEADと一致しているか確認。
4. FAILならログから原因を特定し修正→再CI。
5. PASSならBrowser/Postgres/Securityの次工程へ進む。
6. 作業が進むたびこのファイルを更新する。
7. テストが存在することとCIでPASSしたことを混同しない。
8. PR #2は古いbranchなので直接mergeしない。

## 完成条件
- Seller Application API + Admin review acceptance PASS
- Browser backend acceptance PASS
- Postgres Acceptance PASS
- Security Regression PASS
- Backend Regression PASS
- Clean Install PASS
- Commerce/Media HTTP E2E PASS
- 最終セキュリティレビュー完了
- 最新mainへ安全に統合できる状態を確認

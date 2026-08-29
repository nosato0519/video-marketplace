# Video Marketplace — Commerce作業進捗・再開チェックポイント

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`

## 現在地点
- 作業ブランチ: `feat/seller-application-main-integration`
- 最新作業コミット: `8541f9dc196e7d58f130a96e72745e550a1e763b`
- Browser Acceptance #22 / `33239846853`: 実行中
- #21 / `33239757589`: FAIL。`#app` が10秒間空のまま。Backend、migration、health check、frontend proxy、Playwright/Chromiumは正常。
- #21後の診断強化として、index/main.jsのHTTP status/content-type/contentとrequestfailed/pageerror/consoleを採取するテストを追加済み。
- 今回はさらにブラウザ内で `/app/main.js` を動的importするprobeを追加し、module実行失敗を明示的に検出できるようにした。
- Backend Regression #571: PASS
- Clean Install #154: PASS
- Seller Application Acceptance #2: PASS
- 現在: Browser Acceptance #22で実ブラウザテスト実行中。結果待ち。

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
- Browser E2EにSPA asset/HTTP/request diagnosticsを追加
- Browser E2Eにmain.js dynamic import probeを追加

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
- #20 / `33239655068`: FAIL。`.site-header` がSPA描画前の状態で見つからずtimeout。
- #21 / `33239757589`: FAIL。`#app` が10秒間空のまま。SPA bootstrapが実行されていない/失敗している可能性が高い。
- #22 / `33239846853`: 実行中。`b26d451...` を対象にasset/request diagnosticsを実行。

## #22後の診断方針
- `/` のindex.htmlと `/app/main.js` はpage.requestで直接取得してHTTP status/content-type/contentを確認する。
- Browser側ではpageerror/console/requestfailedを収集する。
- さらに `page.evaluate(() => import('/app/main.js?...'))` でmoduleの実行可否を直接probeする。
- module probeが失敗した場合、その例外内容とrequest failureを根本原因として修正する。
- probeが成功してもSPAが空なら、`main.js` のrender実行経路を次に確認する。

## 最新テスト修正
コミット:
`8541f9dc196e7d58f130a96e72745e550a1e763b`

変更:
- `/app/main.js` のブラウザ内dynamic import probeを追加。
- module import失敗時に例外内容を明示する。
- 既存のHTTP asset/request/pageerror/console diagnosticsを維持。
- Seller Applicationの実Backend検証は維持。

## 残作業（優先順）
1. Browser Acceptance #22 / `33239846853` の実Run完了・結果確認。
2. FAILならmodule probe/HTTP/request/pageerror情報から根本原因を特定して修正→再CI。
3. PASSならBrowser Smoke / module smokeの必要部分を安全に移植・検証。
4. Postgres Acceptanceでseller application migration/APIを最新統合状態で確認。
5. Security Regressionを最新統合状態で確認。
6. Commerce/Media全CIを最新統合状態で再確認。
7. 最新mainとの差分を再確認し、main統合前のレビュー。
8. 最終セキュリティレビュー。
9. 全CIと最終条件がPASSするまで完成判定しない。

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

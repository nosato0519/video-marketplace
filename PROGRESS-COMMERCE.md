# Video Marketplace — Commerce作業進捗・再開チェックポイント

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`

## 現在地点
- 作業ブランチ: `feat/seller-application-main-integration`
- 最新作業コミット: `b26d451fd24a2a8c708595a3ad367ba87ee35579`
- Browser Acceptance #21 / `33239757589`: FAIL
- #21原因: `/` を開いた後も `#app` が10秒間空のまま。Backend、migration、health check、frontend proxy、Playwright/Chromiumは正常。
- #21時点でSPA bootstrap原因を直接観測できるようpageerror/console/requestfailed収集を追加していたが、`#app`待機で先にtimeoutするため十分な診断情報を確定できていない。
- 今回の対応: Browser testにindex.htmlとmain.jsの直接HTTP取得・content-type・期待script内容の確認を追加。ブラウザのrequestfailedも収集し、SPAが描画されない場合のpoll失敗メッセージへDOM/console/requestfailedを含めるよう修正。
- Backend Regression #571: PASS
- Clean Install #154: PASS
- Seller Application Acceptance #2: PASS
- 現在: Browser Acceptance #21の根本原因観測を強化済み。新CI Runの結果待ち。

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
- #21 / `33239757589`: FAIL。`#app` が10秒間空のまま。SPA bootstrapが実行されていない/失敗している可能性が高いが、追加診断を次Runで確定する。

## #21後の診断方針
- `app/index.html` が `/app/main.js` をmoduleとして読み込むことを確認済み。
- `app/main.js` は `document.querySelector('#app')` 後に `render()` を呼び、homeでは`.site-header`を生成する。
- `app/auth/auth-view.js` は`#auth-form`を生成する。
- CI frontend proxyは `/` → `/app/index.html`、`/app/*` → repository file、`/api/*` → backendへproxyする。
- 次Runではbrowser test自身がindex/main.jsのHTTP status/content-type/contentとrequestfailed/pageerror/consoleを採取し、module scriptが取得・実行されているかを直接判定する。

## 最新テスト修正
コミット:
`b26d451fd24a2a8c708595a3ad367ba87ee35579`

変更:
- `/` のindex.htmlをpage.requestで直接取得し、200系・HTML content-type・`/app/main.js`参照を確認。
- `/app/main.js` をpage.requestで直接取得し、200系・JavaScript content-type・主要コード存在を確認。
- browser `requestfailed` を収集。
- SPA bootstrap待機の失敗メッセージへDOM、consoleErrors、failedRequestsを含める。
- Seller Applicationの実Backend検証は維持。

## 残作業（優先順）
1. `b26d451...` を対象とする修正版Backend Browser Acceptance CIの実Run発生・結果確認。
2. FAILならHTTP asset/request/pageerror情報からSPA bootstrapの根本原因を特定して修正→再CI。
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

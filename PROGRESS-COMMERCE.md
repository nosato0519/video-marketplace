# Video Marketplace — Commerce作業進捗・再開チェックポイント

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`

## 現在地点
- 作業ブランチ: `feat/seller-application-main-integration`
- 最新作業コミット: `ee68524756f0bc1bf1adf75be87fdab73aa6a812`
- Browser Acceptance #18: FAIL
- Browser #18原因: 現行SPAの実UIと、テストがハッシュURL直行後に即 `#auth-form` を期待する方式が噛み合わなかった。
- 現行UI確認: `app/auth/auth-view.js` は実際に `#auth-form` を生成する。`app/main.js` は `/register` で `renderAuthPage('register')` を呼ぶ。
- 対応: Playwrightの登録導線をホーム → 実際の「Sign up」リンククリック → `#/register` → `#auth-form` の順に変更。SPAの実ユーザーナビゲーションを検証する方式へ修正。
- Backend Regression #571: PASS
- Clean Install #154: PASS
- Seller Application Acceptance #2: PASS
- 現在: Browser Acceptanceテスト修正済み。新CI Run発火・結果待ち。

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

### #18の調査結果
- `app/index.html` は `/app/main.js` をmoduleとしてロード。
- `app/main.js` の `/register` は `renderAuthPage('register')` を呼ぶ。
- `app/auth/auth-view.js` は `#auth-form` を生成する。
- したがってDOM実装そのものが欠落しているわけではない。
- Browserテストを「直接ハッシュURLへ移動」から「ホームを開く→実際のSign upリンクをクリック」に変更し、実ユーザー導線を検証する。

## 最新テスト修正
コミット:
`ee68524756f0bc1bf1adf75be87fdab73aa6a812`

変更:
- `page.goto(appUrl)` を実行
- `#app` の表示を確認
- `Sign up`リンクをクリック
- `#/register`への遷移を確認
- その後 `#auth-form` を確認して入力
- Seller Application以降の実Backend検証は維持

## 残作業（優先順）
1. `ee685247...` を対象とする修正版Backend Browser Acceptance CIの実Run発生・PASS確認。
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

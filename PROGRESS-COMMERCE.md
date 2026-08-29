# Video Marketplace — Commerce作業進捗・再開チェックポイント

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`

## 現在地点
- 作業ブランチ: `feat/seller-application-main-integration`
- 最新作業コミット: `475459fe1b9002998a176f024902aeeaacd72365`
- Browser Acceptance failed run: `33239035283`
- Browser failure原因: 初回はregister画面のEmail selector不一致。その後Seller Application表示後に現UIに存在しない `Pending review` 見出しを期待していた。
- 修正: Playwrightを現行UIに合わせ、申請後に実API `GET /api/seller/application` を確認する方式へ変更。
- Backend Regression #571: PASS
- Clean Install #154: PASS
- Seller Application Acceptance #2: PASS
- 現在: Browser Acceptanceテストの期待値修正済み。新CI Runの結果待ち。

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

## Browser Acceptance
初回Run `33239035283` はFAIL。

初回の失敗原因:
- `#/register` の現行UIとPlaywrightの `getByLabel('Email')` selectorが不一致。

その後の修正でregister処理は通過し、Seller Application画面まで到達したが、次の期待値が現行UIと不一致だった:
- `getByRole('heading', { name: 'Pending review' })`
- 申請後にUIがPending review画面を描画する実装ではない。

今回の修正コミット:
`475459fe1b9002998a176f024902aeeaacd72365`

修正内容:
- 申請後の存在しない `Pending review` 見出しへの依存を削除。
- 申請後に実Backendの `GET /api/seller/application` を呼び、application存在・status=`pending`・displayName・legalName・countryCodeを検証。
- `/api/auth/me` でユーザーroleがbuyerのままであることも継続確認。

## PR #2について
`feat/seller-application` はmainより62コミット先行・12コミット遅れで分岐しているため、丸ごとmergeしない。必要機能をmainへ機能単位で移植している。

## 残作業（優先順）
1. 修正版Backend Browser Acceptance CIの実Run発生・PASS確認。
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
3. 修正版Browser Acceptanceの最新runを確認。
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

# Video Marketplace — Commerce作業進捗・再開チェックポイント

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`

## 現在地点
- 作業ブランチ: `feat/seller-application-main-integration`
- 最新作業コミット: `a64e5327298173e615eb9fb41036fa4646971f3f`
- ベースmain: `72eb8749cc2ceaed7a95c9c120f75afec213aeb9`
- Backend Regression #565: PASS
- Clean Install #154: PASS
- 現在: Seller Application機能を最新mainへ安全に移植し、専用Acceptance CIを追加済み。CI実行結果待ち。

## 今回の実装
- `backend/migrations/011_seller_applications.sql` を追加
- buyer向け `backend/src/seller/application-routes.js` を追加
- admin向け `backend/src/admin/seller-application-routes.js` を追加
- `backend/src/app.js` にseller application/admin review routesを追加
- `backend/package.json` に `test:http-seller-application-acceptance` を追加
- `backend/scripts/http-seller-application-acceptance.js` を追加
- `.github/workflows/seller-application-acceptance.yml` を追加

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

## CI待ち
専用workflow `Seller Application Acceptance` を追加済み。以下をCIで確認する。
1. npm install
2. migrate:preflight
3. migrate
4. seller application HTTP acceptance

## 既存の確定PASS
- Backend Regression #565 全工程PASS
- Clean Install #154 全工程PASS
- Core 187/187 PASS
- Payment / Purchase / Seller Earnings / Payout / Media系PASS

## PR #2について
`feat/seller-application` はmainより62コミット先行・12コミット遅れで分岐しているため、丸ごとmergeしない。必要機能をmainへ機能単位で移植している。

## 残作業（優先順）
1. Seller Application Acceptance CIのPASS確認。
2. PASSなら現在mainとの差分と実装を再確認。
3. Browser backend acceptanceをmain統合ブランチへ追加・検証。
4. Browser smoke / module smokeの必要部分を安全に移植・検証。
5. Postgres Acceptanceでseller application migration/APIを確認。
6. Security Regressionを最新統合状態で確認。
7. Commerce/Media全CIを最新統合状態で再確認。
8. 最終セキュリティレビュー。
9. 全CIと最終条件がPASSするまで完成判定しない。

## 再開手順
1. このファイルを最初に読む。
2. `feat/seller-application-main-integration` のHEADを確認。
3. Seller Application Acceptance CIの最新runを確認。
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

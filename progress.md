# Video Marketplace – 開発進捗ログ

最終更新: 2026-09-01

## 現在の作業基準
- リポジトリ: `nosato0519/video-marketplace`
- 主要PR: #13
- PR head: `8e0d3fe0a4fc0e9fa4b65ff2cbd266c81f8a5c04`
- 作業方針: 必要な修正のみ。既存テスト・実装を重複して作り直さない。

## Buyer実Backend Browser Acceptance
- 実DB + Session + 商品表示 + Order + 決済Webhook + Entitlement + Library + Watch + Download の一連テストを実装済み。
- CI用 `DATABASE_URL` 設定と `seller_earnings` FK cleanup 修正済み。
- SPA hash route (`#/browse`, `#/library`, `#/watch/...`) 対応済み。
- Library見出し期待値の不整合を修正済み。
- Buyerテストコードをこれ以上変更しない。次はCI実測のみ。

## CI
- `.github/workflows/backend-browser-acceptance.yml` は PR側でBuyer実Backend Acceptanceを実行する構成。
- `pull_request` / `push(main)` / `workflow_dispatch` が設定済み。
- GitHub Actions RunがPR headに取得できない状態が継続。
- Ready for Review操作はGitHub連携GraphQLの `Repository.fullDatabaseId` エラーで実行不可。
- リポジトリ権限はadminであり権限不足ではない。
- CI実測前にWorkflowやテストを無意味に変更しない。

## 次の作業
1. GitHub Actionsの実行経路を確保する。
2. Buyer Browser Acceptanceを実測。
3. GREENならBuyer完了としてSeller/Adminへ移行。
4. FAILなら実測で失敗した箇所だけ修正。
5. 最終的にSeller/Admin、決済・Refund/Payout、Security、Release Gateを確認。

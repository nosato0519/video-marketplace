# VIDEO MARKETPLACE Progress Log

## CURRENT RESUME POINT — 2026-09-10

**本日の作業はここで終了。次回は `5b4ed0664e51c97a951ef2387df3863abd45706e` のLIVE状態を基準に再開する。トップページは完成済みとして扱い、今回解消した初回アクセス時のナビゲーション不具合を再発させない。**

### 1. 本日の到達点
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- 最新機能修正コミット: `5b4ed0664e51c97a951ef2387df3863abd45706e`
- Render service: `video-marketplace-demo-live`
- 最新Render deploy: `dep-dah7h6jeogqs739mfu9g`
- 最新deploy status: **live**
- ユーザーが実際にRender上のデモを開けることを確認。

### 2. 本日解消した問題
トップページを最初に開いた直後、右上の以下の操作が子ページへ遷移しない問題を修正。
- 販売者デモ
- 購入者デモ
- 販売者ログイン
- 購入者ログイン

原因調査では、元の `demo/index.html` に無効化されたナビゲーション（`href="#"` / `event.preventDefault()`）が存在し、さらに複数のproxy/起動層がナビゲーションを重複制御していたことを確認。単純なキャッシュ問題として扱わず、初回ロード時のナビゲーションを専用ガードで固定した。

### 3. 修正履歴
- `47d1fb8d0fd85d45f4793c9bb70fd7754528770d`
  - Homepage navigationを明示的な実ルートへ修正。
- `89644d0f128a3500c7b5cf72a86691cde9663003`
  - 初回ロードのfreshness対策を追加。ただし根本原因の確定修正とは扱わない。
- `48f5b3ecb49b7f058b66258db8c565d0c3629190`
  - `homepage-navigation-guard.mjs` を追加し、初回ロード時のナビゲーションを保護。
- `5b4ed0664e51c97a951ef2387df3863abd45706e`
  - `demo/package.json` のstartを `homepage-navigation-guard.mjs` に変更し、現在の起動経路を固定。

### 4. 現在の重要ルート
- 販売者デモ → `/pages/creator-studio.html`
- 購入者デモ → `/pages/video-list.html`
- 販売者ログイン → `/pages/login.html`
- 購入者ログイン → `/pages/login.html`

### 5. 再発防止ルール
- **今後の修正で上記ナビゲーションを元に戻さない。**
- 新しいproxyやclick interceptorを追加して競合させない。
- `homepage-navigation-guard.mjs` を現在の初回ロードナビゲーションの基準とする。
- 共有startup/proxy/navigationに触れる修正をした場合は、既存のnavigation E2E/ブラウザ検証を必ず実行する。
- 動作確認なしで「修正済み」「GREEN」と断定しない。
- トップページを理由なく作り直さない。
- スクリーンショットを要求して済ませず、GitHub/Render/テストで確認できるものを先に確認する。

### 6. 次回の再開位置
1. GitHubの最新コミットを確認。
2. Renderの最新deployがLIVEか確認。
3. 今日のナビゲーション修正を壊していないことを確認。
4. その後、残っている具体的な子ページ/デモ受入項目だけを進める。
5. 完了済みのHomepage/Screen #2–#9を無駄に作り直さない。

### 7. 完成・変更しない範囲
- Homepage / Screen #1: FROZEN。
- Screen #2 Video list/search: completed。
- Screen #3 Product detail: completed。
- Screen #4 Checkout: completed。
- Screen #5 Library: completed。
- Screen #6 Watch: completed。
- Screen #7 Creator Studio: completed。
- Screen #8 Admin: completed。
- Screen #9 Common pages: completed。

### 8. 商用デモ境界
- 現在は販売用ショーケースデモ。
- 実決済、実認証情報保存、実メディアダウンロード、production credentialsはまだ接続しない。
- ZIPはユーザーが明示的に求めるまで作成しない。

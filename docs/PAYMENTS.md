# 決済サービス接続・運用ガイド

このガイドは、VIDEO MARKETPLACE を導入する運営者向けです。実決済には、運営者自身が契約・管理する決済事業者アカウントが必要です。決済サービスの契約、本人確認、利用可能な国・通貨、手数料、審査条件は決済事業者の案内に従ってください。

## 1. このバージョンで接続できる決済サービス

実決済アダプターが実装されているのは **Stripe と PayPal Checkout** です。Adyen、Paddle、PayPay はこのバージョンでは未実装です。PayPalは運営者アカウントで受け付けるCheckoutであり、販売者ごとの自動分配・送金を行うPayPalマーケットプレイス契約を代替するものではありません。PayPalのマーケットプレイス向け機能を本番で利用するには、PayPalのパートナー承認が必要です。

この構成では、StripeまたはPayPalの運営者アカウントで決済を受け付けます。販売者の売上はシステム内で記録され、販売者への支払いは運営者が別途定めた精算手順に従います。Stripe ConnectやPayPalのマーケットプレイス機能による販売者ごとの直接入金を意味するものではありません。

## 2. PayPal Checkout のテスト設定

1. PayPal Developer DashboardでSandboxアプリを作成し、Client IDとSecretを取得します。
2. SandboxのWebhook endpointに `https://あなたのドメイン/api/payments/paypal/webhook` を登録し、`CHECKOUT.ORDER.APPROVED`、`PAYMENT.CAPTURE.COMPLETED`、`PAYMENT.CAPTURE.DENIED`、`PAYMENT.CAPTURE.REFUNDED` を購読します。
3. Webhook IDを取得し、バックエンド環境変数に登録します。
4. `PAYPAL_ENVIRONMENT=sandbox`、`PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`、`PAYPAL_WEBHOOK_ID`、`PAYPAL_SUCCESS_URL`、`PAYPAL_CANCEL_URL` を設定し、`PAYMENT_PROVIDER=paypal` にします。
5. サンドボックス購入で、Webhook後に注文が購入済みになり、マイライブラリに反映されることをテスト環境で確認します。

PayPalのWebhook署名はPayPal APIで検証します。購入者が戻り先URLに到達しただけでは購入済みにはなりません。注文承認Webhookを受けた後にサーバー側でCaptureを行い、決済確定を処理します。PayPalのマーケットプレイス向けパートナー機能は別途審査・承認が必要です。

## 3. Stripeアカウントの準備

1. Stripeの公式サイトで運営者のアカウントを作成し、事業者情報や本人確認など必要な審査を完了します。
2. 最初はテストモードで接続設定を行います。
3. Stripe Dashboard の APIキー画面で、テスト用の Secret key（`sk_test_...`）を取得します。
4. Webhookの設定後、テスト決済で注文状態・ライブラリ反映・失敗処理を確認します。
5. 本番公開時は本番モードに切り替え、本番用 Secret key（`sk_live_...`）と本番用 Webhook signing secret（`whsec_...`）を設定します。テスト用と本番用のキーを混在させないでください。

Stripeの画面名は変更されることがあるため、最新の画面操作はStripe公式ドキュメントを参照してください。

## 4. APIサービスの環境変数

ホスティング事業者の**バックエンドAPIサービス**の環境変数・Secrets画面に次の値を登録します。フロントエンドの公開環境変数には登録しないでください。

| 環境変数 | 設定値 |
|---|---|
| `PAYMENT_PROVIDER` | `stripe` または `paypal` |
| `PAYPAL_ENVIRONMENT` | テスト時は `sandbox`、承認済み本番利用時のみ `live` |
| `PAYPAL_CLIENT_ID` | PayPal API Client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal API Secret |
| `PAYPAL_WEBHOOK_ID` | PayPal Webhook ID |
| `PAYPAL_SUCCESS_URL` / `PAYPAL_CANCEL_URL` | 公開HTTPSの戻り先URL |
| `STRIPE_SECRET_KEY` | StripeのSecret key。テスト時は `sk_test_...`、本番は `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook endpointが発行する署名シークレット `whsec_...` |
| `STRIPE_SUCCESS_URL` | `https://あなたのドメイン/pages/purchase-complete.html` |
| `STRIPE_CANCEL_URL` | `https://あなたのドメイン/pages/video-list.html` |

- `あなたのドメイン` は、実際に公開するHTTPSドメインに置き換えます。
- `STRIPE_SUCCESS_URL` と `STRIPE_CANCEL_URL` は公開HTTPS URLを指定します。`STRIPE_SUCCESS_URL` に `orderId` や `session_id` のクエリパラメーターをあらかじめ付けないでください。システムが決済対象の注文番号とStripe Checkout session IDを成功URLへ付加するため、固定値を設定すると戻り先の注文情報が一致しない原因になります。
- Stripe用Webhookでは `STRIPE_WEBHOOK_SECRET` を使用します。`PAYMENT_WEBHOOK_SECRET` はStripe endpointの署名検証には使用しません。
- APIキーや署名シークレットをGitHub、ソースコード、ログ、ブラウザー側のコードに保存しないでください。
- 環境変数を保存した後、APIサービスを再デプロイまたは再起動します。

## 5. Stripe Webhookを設定する

Stripe DashboardでWebhook endpointを作成し、次のURLを登録します。

```text
https://あなたのドメイン/api/payments/stripe/webhook
```

少なくとも次のイベントを購読します。

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.refunded`

Webhook endpointの作成後に表示される署名シークレットを、環境変数 `STRIPE_WEBHOOK_SECRET` に登録します。テストモードと本番モードではWebhook endpointと署名シークレットを分けて管理してください。

**重要：** ブラウザーが成功URLへ戻ったことだけでは、購入済みとして扱いません。Stripeから署名検証済みのWebhookを受信し、注文金額・通貨・注文番号と照合して決済成功が確定した後に、注文を購入済みにしてライブラリ権限を発行します。Webhookは外部から到達できるHTTPS URLに設定し、ホスティングやファイアウォールで遮断しないでください。

## 6. 購入者の購入から視聴まで

1. 購入者がログインし、公開中の作品から購入する作品を選択します。
2. 購入手続き画面で金額を確認し、「購入手続きへ進む」を押します。
3. システムがStripe Checkoutの安全な決済画面へ遷移します。
4. 購入者がStripe画面で支払いを完了すると、設定した成功URLへ戻ります。
5. Stripe Webhookで決済が確定すると、注文ステータスが購入済みに更新され、マイライブラリに作品の視聴・ダウンロード権限が反映されます（利用可能な機能は作品設定に従います）。
6. 購入者は購入履歴・注文詳細・マイライブラリから注文と作品を確認できます。

Webhookの到着には時間差が生じる場合があります。成功URLへ戻った直後に注文が「確認中」と表示された場合は、少し待って購入履歴または注文詳細を再読み込みします。ブラウザー画面だけで注文を手動で購入済みに変更しないでください。

Stripe Checkout を途中で閉じるなどしてセッションが期限切れになった場合、PaymentIntent が付いていない期限切れイベントは決済IDとして誤認しないため処理対象から除外されます。このケースでは、そのWebhookだけで保留中の注文がキャンセル扱いになるとは限りません。期限切れ注文を再利用して決済を再開せず、購入者画面から作品を選び直して新しい注文を作成してください。決済結果が不明なまま注文を手動で再開したり、同じ注文に対して別の決済を作成したりしないでください。

## 7. テストモードで確認する項目

本番キーへ切り替える前に、Stripeテストモードで次を確認します。

- [ ] 購入手続きからStripe Checkoutへ遷移する
- [ ] テスト決済の成功Webhook後に注文が `paid` になる
- [ ] 該当注文のライブラリ権限が発行され、作品を開ける
- [ ] 決済キャンセル・失敗時に注文が購入済みにならない
- [ ] 同じWebhookが再送されても注文や権限が重複しない
- [ ] 金額・通貨が注文と一致しないWebhookで購入済みにならない
- [ ] 全額返金イベント後に注文が返金済みとなり、ライブラリ権限が取り消される
- [ ] ログアウト状態や別の購入者アカウントから購入作品へアクセスできない

部分返金は現行実装の対象外です。Stripe Dashboardで部分返金を実施する運用は、部分返金の処理を別途実装するまで採用しないでください。

**販売者への精算後に全額返金が発生した場合：** システムは注文を返金済みにし、視聴権限を取り消し、該当する販売者売上を返金済みに更新します。ただし、すでに運営者が販売者へ送金した金額を自動回収したり、販売者残高から自動控除したりはしません。返金イベントの処理後、運営者は該当注文と精算履歴を照合し、契約・法令に沿って販売者との返金額の精算を別途管理してください。返金済み売上を含む未払いの精算申請は、処理中・支払済みに進められない設計です。これは送金済み金額の自動回収機能を意味しません。

## 8. トラブルシューティング

| 症状 | 確認箇所 |
|---|---|
| 購入開始時に決済プロバイダー未設定のエラー | `PAYMENT_PROVIDER=stripe`、APIサービスの環境変数、再デプロイ状況 |
| Stripe Checkout URLが作成されない | `STRIPE_SECRET_KEY`、`STRIPE_SUCCESS_URL`、`STRIPE_CANCEL_URL` |
| PayPal Checkout URLが作成されない | `PAYMENT_PROVIDER=paypal`、PayPal Sandbox Client ID/Secret、成功・キャンセルURLを確認 |
| PayPal Webhookが401になる | PayPal SandboxのWebhook IDとAPI環境が一致しているか確認 |
| Webhookが401になる | Stripe Dashboardの署名シークレットと `STRIPE_WEBHOOK_SECRET` が同じモードのものか確認 |
| Webhookが503になる | `STRIPE_WEBHOOK_SECRET` がAPIサービスに登録されているか確認 |
| 決済後も注文が確認中のまま | Stripe DashboardのWebhook配信履歴、HTTP応答、APIログ、注文番号・金額・通貨の照合結果を確認 |
| 決済済みだがライブラリに作品がない | 注文ステータス、Webhook処理結果、entitlementの登録、作品の公開・メディア状態を確認 |
| `payment_provider_adapter_not_ready` | `PAYMENT_PROVIDER` が `stripe` になっているか確認。別プロバイダーは実装済みアダプターが必要 |

ログやサポート連絡には、APIキー、Webhook署名シークレット、カード情報、購入者の個人情報を含めないでください。必要な場合は、時刻、注文番号、エラーコード、秘密情報を除いたログを使用します。

## 9. 本番公開へ切り替える

1. テストモードで上記チェック項目を確認します。
2. Stripeの本番アカウント審査と利用条件を確認します。
3. `STRIPE_SECRET_KEY` を本番Secret keyへ、`STRIPE_WEBHOOK_SECRET` を本番Webhook endpointの署名シークレットへ置き換えます。
4. Stripe本番モードでWebhook endpointと必要イベントを登録します。
5. HTTPSドメイン、成功URL、キャンセルURL、Webhook URLがすべて本番ドメインであることを確認します。
6. APIサービスを再デプロイし、運営者が管理する手順で本番公開を行います。

決済事業者の審査・利用規約、返金・チャージバック対応、税務、特定商取引法表示、プライバシーポリシー等は、事業を運営する国・地域と販売形態に合わせて整備してください。

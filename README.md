🚀 terraform applyで作成されるGCPリソース一覧

  📦 ネットワーク関連

  1. VPC Network (google_compute_network.main_vpc)
    - 名前: prod-vpc
    - リージョナルルーティング
  2. Subnet (google_compute_subnetwork.main_subnet)
    - 名前: prod-subnet
    - CIDR: 10.0.0.0/24
    - プライベートGoogleアクセス有効

  🏃 Cloud Run サービス (3つ)

  1. DD-OPS メインアプリ (google_cloud_run_v2_service.dd_ops)
    - 名前: dd-ops-prod
    - CPU: 2, メモリ: 1Gi
    - 最大100インスタンス
  2. OCR API v2 (google_cloud_run_v2_service.ocr_api)
    - 名前: dd-ops-ocr-api-v2
    - CPU: 4, メモリ: 8Gi
    - 最小1〜最大10インスタンス
  3. ファイルアップロード (google_cloud_run_v2_service.file_upload)
    - 名前: file-upload-app
    - CPU: 1, メモリ: 512Mi
    - 最大100インスタンス

  🗄️ データベース

  1. Cloud SQL インスタンス (google_sql_database_instance.main)
    - 名前: dd-ops-db-prod
    - PostgreSQL 15
    - スペック: 2vCPU, 7.5GB RAM
    - ディスク: 100GB SSD
    - 自動バックアップ有効
    - プライベートIP接続
  2. データベース (google_sql_database.main)
    - 名前: dd_ops
  3. DBユーザー (google_sql_user.app_user)
    - ユーザー名: dd_ops_user
    - ランダムパスワード生成

  🪣 Storage Buckets (3つ)

  1. アプリ契約バケット (google_storage_bucket.app_contracts)
    - 名前: app-contracts-prod
    - CORS設定済み
    - バージョニング有効
    - 90日後に自動削除
  2. モデルバケット (google_storage_bucket.dd_ops_models)
    - 名前: dd-ops-models-prod
    - バージョニング有効
  3. Terraformステートバケット (google_storage_bucket.terraform_state)
    - 名前: reflected-flux-462908-s6-terraform-state-prod
    - バージョニング有効
    - ステート管理用

  🔐 サービスアカウント (3つ)

  1. DD-OPSサービスアカウント (google_service_account.dd_ops_sa)
    - dd-ops-prod@reflected-flux-462908-s6.iam.gserviceaccount.com
  2. ファイルアップロードSA (google_service_account.file_upload_sa)
    - file-upload-prod@reflected-flux-462908-s6.iam.gserviceaccount.com
  3. Storage URL署名SA (google_service_account.storage_url_signer)
    - storage-url-signer@reflected-flux-462908-s6.iam.gserviceaccount.com

  🔑 IAM権限設定

  - DD-OPS SA: Cloud SQL、Storage、Secret Manager、Logging、Monitoring権限
  - File Upload SA: Storage Admin、Logging権限
  - URL Signer SA: Storage Admin権限

  📨 Pub/Sub

  1. OCRトピック (google_pubsub_topic.ocr)
    - 名前: ocr-prod
  2. OCR DLQトピック (google_pubsub_topic.ocr_dlq)
    - 名前: ocr-prod-dlq
  3. OCRサブスクリプション (google_pubsub_subscription.ocr)
    - 名前: ocr-subscription-prod
    - 最大5回リトライ

  🔒 Secret Manager

  1. データベースURL (google_secret_manager_secret.database_url)
    - 名前: database-url-prod
    - PostgreSQL接続文字列を格納

  ⚖️ ロードバランサー/CDN

  1. バックエンドバケット (google_compute_backend_bucket.app_contracts_backend)
    - CDN有効
    - キャッシュ設定
  2. バックエンドサービス (google_compute_backend_service.dd_ops_backend)
    - Cloud Run用バックエンド
  3. NEG (google_compute_region_network_endpoint_group.dd_ops_neg)
    - Cloud Run用ネットワークエンドポイントグループ
  4. URLマップ (google_compute_url_map.main)
    - パスルーティング設定
    - /api/* → Cloud Run
    - /pdf/* → Storage
  5. ヘルスチェック (google_compute_health_check.http)
    - /healthエンドポイント監視
  6. SSL証明書 (google_compute_managed_ssl_certificate.main)
    - dd-ops.net, www.dd-ops.net用
  7. HTTPSプロキシ (google_compute_target_https_proxy.main)
  8. グローバル転送ルール (google_compute_global_forwarding_rule.main)
    - HTTPS(443)ポート

  📊 モニタリング

  1. アラートポリシー (google_monitoring_alert_policy.high_error_rate)
    - エラー率1%以上で通知

  🔧 その他

  1. ランダムパスワード (random_password.db_password)
    - DB接続用の32文字パスワード
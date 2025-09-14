# DD-OPS Terraform Infrastructure

## 📋 プロジェクト概要

このTerraformコードは、**任意のGCPアカウントで同一構成のDD-OPS環境を簡単に構築できる**よう完全ポータブル化されています。

### 🎯 主な改善点

#### **Before（問題点）**
- ❌ プロジェクトIDやドメインがハードコード
- ❌ Dockerイメージが特定アカウントに依存
- ❌ 手動セットアップが複雑
- ❌ 別アカウントでの再現が困難

#### **After（解決策）**
- ✅ 全ての値が変数化済み
- ✅ sub_domainシステムで簡単ドメイン管理（`demo.dd-ops.net`）
- ✅ 完全自動CI/CDシステム（GitHub push → Build → Deploy）
- ✅ ワンコマンド自動セットアップ（`./setup.sh`）

### 🚀 新しいアカウントでの簡単デプロイ

```bash
# たった4ステップで完了！
git clone <このリポジトリ>
cd dd-ops-terraform
cp terraform.tfvars.example terraform.tfvars
# project_id, sub_domain, github設定を編集
./setup.sh
```

### 📁 主要ファイル構成

```
dd-ops-terraform/
├── main.tf                    # メインのインフラ定義
├── variables.tf               # 変数定義（完全変数化済み）
├── outputs.tf                 # 出力定義
├── artifact_registry.tf       # Dockerレジストリ
├── cloud_build.tf            # 自動ビルドシステム
├── terraform.tfvars.example  # 設定例テンプレート
├── setup.sh                  # 自動セットアップスクリプト
├── validate.sh               # 設定検証スクリプト
├── README.md                 # このファイル
└── WORKLOG.md               # 改善作業履歴
```

## 🔄 自動CI/CDシステム

GitHubにコードをpushすると、以下が自動実行されます：

```
GitHub Push → Cloud Build Trigger → Docker Build → Artifact Registry → Cloud Run Deploy
```

**各サービスが自動デプロイ対象**:
- `dd-ops-main`: DD-OPSメインアプリケーション
- `dd-ops-ocr-api-v2`: OCR処理API
- `file-upload-app`: ファイルアップロードサービス
- `get-file-path`: ファイルパス取得サービス

**デプロイフロー**:
1. 🔨 Dockerイメージをビルド
2. 📦 Artifact Registryにプッシュ
3. 🚀 Cloud Runサービスに自動デプロイ
4. ✅ 新しいバージョンが即座に反映

---

## 🛠️ 詳細セットアップ手順

### 1. 設定ファイルの準備
```bash
# terraform.tfvars.exampleをコピー
cp terraform.tfvars.example terraform.tfvars
```

### 2. terraform.tfvarsの編集
以下の値を実際の環境に合わせて変更してください：

```hcl
# あなたのGCPプロジェクトID
project_id = "my-gcp-project-123"  # ← 実際のプロジェクトIDに変更

# サブドメイン（自動でdemo.dd-ops.net, www.demo.dd-ops.netが生成される）
sub_domain = "demo"  # ← あなたの環境名に変更（例：staging, client-a, など）

# Dockerイメージパス（プロジェクトIDを含む）
dd_ops_image         = "asia-northeast1-docker.pkg.dev/my-gcp-project-123/app-images/dd-ops:latest"
ocr_api_image        = "asia-northeast1-docker.pkg.dev/my-gcp-project-123/app-images/ocr-api:latest"
file_upload_image    = "asia-northeast1-docker.pkg.dev/my-gcp-project-123/app-images/file-upload:latest"
get_file_path_image  = "asia-northeast1-docker.pkg.dev/my-gcp-project-123/app-images/get-file-path:latest"

# GitHub設定（自動ビルド用）
github_owner = "your-github-username"  # ← あなたのGitHubユーザー名
github_repo  = "dd-ops-app"            # ← リポジトリ名
```

**ドメインについて**:
- `sub_domain = "demo"` を設定すると、自動で以下が生成されます：
  - メインドメイン: `demo.dd-ops.net`
  - WWWドメイン: `www.demo.dd-ops.net`
  - CORS設定: `https://demo.dd-ops.net`

### 3. 自動セットアップの実行 (推奨)
```bash
# 設定の検証（オプション）
./validate.sh

# 自動セットアップの実行
./setup.sh
```

### 3-B. 手動セットアップ（上級者向け）
```bash
# 必要なAPIの有効化
gcloud services enable compute.googleapis.com run.googleapis.com cloudbuild.googleapis.com

# Terraformの初期化
terraform init

# プランの確認
terraform plan

# 実際のデプロイ
terraform apply
```

---

## 🚀 terraform applyで作成されるGCPリソース一覧

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
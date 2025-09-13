# Terraform Export - GCP Infrastructure

このリポジトリは、GCPプロジェクト `reflected-flux-462908-s6` からエクスポートされたTerraform設定ファイルです。

## 構成内容

- **Cloud Run Services**: dd-ops、OCR関連サービス、file-upload-app等
- **VPC/Networking**: カスタムVPC、サブネット、ルーティング設定
- **Compute Resources**: ディスク、インスタンス設定
- **IAM**: サービスアカウント設定

## 他のGCPアカウントへの移行における課題

### 1. プロジェクト固有の値の変更
- **プロジェクトID**: `reflected-flux-462908-s6` を新しいプロジェクトIDに全置換が必要
- **Dockerイメージパス**: Container Registry/Artifact RegistryのURLを新プロジェクト用に変更
- **ビルドID/トリガーID**: Cloud Build関連のIDは再作成が必要

### 2. ネットワーク参照の修正
現状の問題：
```terraform
# ハードコードされたURL形式
network = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/networks/dd-ops-vpc"
```

修正が必要：
```terraform
# Terraformリソース参照に変更
network = google_compute_network.dd_ops_vpc.id
```

### 3. 依存関係の明示化
- リソース間の依存関係（`depends_on`）が明示されていない
- 作成順序によってはエラーが発生する可能性

### 4. 環境変数とシークレット
- Secret Managerの参照設定
- 環境変数の値（データベース接続文字列等）の再設定
- APIキー等の機密情報の管理

### 5. IAMとサービスアカウント
- サービスアカウントの権限設定
- Cloud Run等のサービスに紐づくIAMロールの再設定
- Workload Identity設定（使用している場合）

### 6. 外部サービスとの連携
- Cloud SQLインスタンス（参照がある場合）
- Cloud Storageバケット
- Pub/Sub トピック/サブスクリプション
- VPCピアリング設定

### 7. Terraformの状態管理
- `terraform.tfstate`ファイルがない
- 既存リソースがある場合は`terraform import`が必要
- Remote Backend（GCS等）の設定

## 移行手順の推奨事項

1. **変数化の実施**
   ```terraform
   variable "project_id" {
     description = "GCP Project ID"
     type        = string
   }
   ```

2. **モジュール化**
   - 環境別（staging/production）の分離
   - 再利用可能なコンポーネントの抽出

3. **段階的な適用**
   - ネットワーク層 → IAM → アプリケーション層の順で構築
   - `terraform plan`で事前確認を徹底

4. **バージョン管理**
   ```terraform
   terraform {
     required_version = ">= 1.0"
     required_providers {
       google = {
         source  = "hashicorp/google"
         version = "~> 5.0"
       }
     }
   }
   ```

## エクスポートされていない主要リソース

### Cloud Build関連
- **Cloud Build Trigger**: GitHub連携やトリガー条件の設定
  - GitHubトークン/認証情報（機密情報）
  - リポジトリアクセス権限
  - Webhook設定
  - ブランチ/タグのトリガー条件

**対応方法**:
- GCPコンソールまたはTerraformで手動作成
- `cloudbuild.yaml`はGitHubリポジトリ内に存在するため、Trigger設定のみ必要

### その他のエクスポート対象外リソース
- **Source Repository接続**: GitHubやBitbucketとの連携設定
- **GitHub App設定**: インストール済みのGitHub App情報
- **Secret Managerの値**: 機密情報の実際の値（構造のみエクスポート）
- **Binary Authorization**: コンテナイメージの署名ポリシー
- **Cloud Deploy**: 継続的デリバリーパイプライン設定
- **Cloud Scheduler**: 定期実行ジョブの設定
- **Cloud Tasks**: タスクキューの設定
- **Monitoring/Logging**: アラートポリシー、ログシンク、ダッシュボード
- **Firebase関連**: Firebase Auth、Firestore Rules等

## 注意事項

- このエクスポートは既存インフラのスナップショットであり、そのまま`terraform apply`することは推奨されません
- 本番環境への適用前に、必ず開発環境でのテストを実施してください
- 機密情報がハードコードされていないか確認してください（特にDATABASE_URL等）



各開発者が個別にterraform initで作成す
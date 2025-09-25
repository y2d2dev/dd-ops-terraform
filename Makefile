# DD-OPS Terraform Deployment Makefile
#
# 使用方法:
#   make deploy    - 完全なデプロイメント（ビルド→プッシュ→Terraform適用）
#   make build     - Dockerイメージのビルドのみ
#   make push      - Dockerイメージのプッシュのみ
#   make terraform - Terraformの適用のみ
#   make destroy   - インフラの削除
#   make auth      - GCP認証設定

# 設定変数
PROJECT_ID := spring-firefly-472108-a6
FILE_UPLOAD_IMAGE := gcr.io/$(PROJECT_ID)/file-upload-app:latest
DD_OPS_IMAGE := gcr.io/$(PROJECT_ID)/dd-ops:latest
FILE_UPLOAD_DIR := apps/file-upload
DD_OPS_DIR := apps/dd-ops
TFVARS_FILE := customers/terraform-test.tfvars

.PHONY: deploy build push terraform destroy auth help

# デフォルトターゲット
.DEFAULT_GOAL := help

# ヘルプメッセージ
help: ## このヘルプメッセージを表示
	@echo "DD-OPS Terraform Deployment Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# 完全なデプロイメント
deploy: auth build push terraform ## 完全なデプロイメント（認証→ビルド→プッシュ→Terraform適用）
	@echo "✅ デプロイメント完了！"
	@echo "📋 デプロイされたサービス:"
	@echo "  - file-upload-app: 実際のNext.jsファイルアップロードアプリ"
	@echo "  - dd-ops: 実際のNext.js法務DDアプリ"
	@echo "  - ocr_api, get_file_path: テストイメージ（gcr.io/cloudrun/hello）"

# GCP認証設定
auth: ## GCP認証設定
	@echo "🔐 GCP認証を設定中..."
	@gcloud config set project $(PROJECT_ID)
	@echo "✅ 認証スキップ（既存の認証を使用）"

# Dockerイメージビルド
build: build-file-upload build-dd-ops ## 全Dockerイメージをビルド（AMD64プラットフォーム）

build-file-upload: ## file-upload-appイメージをビルド
	@echo "🔨 file-upload-appイメージをビルド中..."
	@cd $(FILE_UPLOAD_DIR) && docker build \
		--platform linux/amd64 \
		--build-arg BUILD_ENV=production \
		-t $(FILE_UPLOAD_IMAGE) .
	@echo "✅ file-upload-appビルド完了"

build-dd-ops: ## dd-opsイメージをビルド
	@echo "🔨 dd-opsイメージをビルド中..."
	@cd $(DD_OPS_DIR) && docker build \
		--platform linux/amd64 \
		-t $(DD_OPS_IMAGE) .
	@echo "✅ dd-opsビルド完了"

# Dockerイメージプッシュ
push: push-file-upload push-dd-ops ## 全DockerイメージをGoogle Container Registryにプッシュ

push-file-upload: ## file-upload-appイメージをプッシュ
	@echo "📤 file-upload-appイメージをプッシュ中..."
	@docker push $(FILE_UPLOAD_IMAGE)
	@echo "✅ file-upload-appプッシュ完了"

push-dd-ops: ## dd-opsイメージをプッシュ
	@echo "📤 dd-opsイメージをプッシュ中..."
	@docker push $(DD_OPS_IMAGE)
	@echo "✅ dd-opsプッシュ完了"

# Terraform適用
terraform: terraform-import terraform-apply ## Terraformを適用してインフラをデプロイ

terraform-import: ## 既存リソースをTerraformにimport
	@echo "📥 既存リソースをimport中..."
	@-terraform import -var-file="$(TFVARS_FILE)" google_sql_database_instance.main projects/$(PROJECT_ID)/instances/dd-ops-db 2>/dev/null || echo "  ℹ️  Cloud SQLインスタンスは既にimport済みまたは存在しません"
	@-terraform import -var-file="$(TFVARS_FILE)" google_secret_manager_secret.database_url projects/$(PROJECT_ID)/secrets/database-url 2>/dev/null || echo "  ℹ️  Secret Managerは既にimport済みまたは存在しません"
	@echo "✅ Import処理完了"

terraform-apply: ## Terraformを適用
	@echo "🏗️  Terraformを適用中..."
	@terraform apply -var-file="$(TFVARS_FILE)" -auto-approve
	@echo "✅ Terraform適用完了"

# インフラ削除
destroy: ## Terraformでインフラを削除
	@echo "🗑️  インフラを削除中..."
	@terraform destroy -var-file="$(TFVARS_FILE)" -auto-approve
	@echo "✅ 削除完了"

# 開発用コマンド
dev-build: ## 開発用ビルド（ローカル確認用）
	@echo "🔨 開発用ビルド..."
	@cd $(APP_DIR) && docker build \
		--build-arg BUILD_ENV=development \
		-t $(IMAGE_NAME)-dev .

dev-run: ## 開発用ローカル実行
	@echo "🚀 開発用ローカル実行..."
	@docker run -p 8080:8080 \
		-e NODE_ENV=development \
		-e NEXT_PUBLIC_BUCKET_NAME=app-contracts \
		-e NEXT_PUBLIC_OCR_API_URL=https://ocr-pro-test-75499681521.asia-northeast1.run.app \
		$(IMAGE_NAME)-dev

# ログ確認
logs: ## Cloud Runのログを確認
	@echo "📋 Cloud Runログを確認中..."
	@gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=file-upload-app" \
		--project=$(PROJECT_ID) --limit=20 --format="value(timestamp,textPayload)"

# ステータス確認
status: ## デプロイ状況を確認
	@echo "📊 デプロイ状況確認中..."
	@gcloud run services list --project=$(PROJECT_ID) --region=asia-northeast1
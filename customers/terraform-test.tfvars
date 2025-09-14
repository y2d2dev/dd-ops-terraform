# DD-OPS Terraform Test Configuration
# spring-firefly-472108-a6 プロジェクト設定

# ========================================
# Project Configuration
# ========================================
project_id  = "spring-firefly-472108-a6"
environment = "dev"
region      = "asia-northeast1"
zone        = "asia-northeast1-a"

# ========================================
# Domain Configuration
# ========================================
sub_domain = "terraform-test"  # → terraform-test.dd-ops.net

# ========================================
# Docker Images (テスト用にパブリックイメージ使用)
# ========================================
dd_ops_image        = "gcr.io/cloudrun/hello"
ocr_api_image       = "gcr.io/cloudrun/hello"
file_upload_image   = "gcr.io/cloudrun/hello"
get_file_path_image = "gcr.io/cloudrun/hello"

# ========================================
# Test Environment Settings
# ========================================
# 最小構成でテスト
cloud_run_cpu_limit = {
  dd_ops        = "1"
  ocr_api       = "1"
  file_upload   = "1"
  get_file_path = "1"
}

cloud_run_memory_limit = {
  dd_ops        = "512Mi"
  ocr_api       = "512Mi"
  file_upload   = "512Mi"
  get_file_path = "256Mi"
}

cloud_run_max_instances = {
  dd_ops        = 1
  ocr_api       = 1
  file_upload   = 1
  get_file_path = 1
}

# ========================================
# Database Configuration (最小構成)
# ========================================
db_tier                       = "db-f1-micro"  # 最小インスタンス
db_disk_size                  = 10              # 10GB
enable_point_in_time_recovery = false          # コスト削減
backup_retention_days         = 3              # 短期保持

# ========================================
# Build Configuration
# ========================================
branch_name = "main"

# GitHub Configuration - サービス別リポジトリ対応完了！
# 各サービスが専用リポジトリを使用
# ※ github_repositories はデフォルト値を使用（variables.tf参照）

# Build triggerは現在無効化されているため
github_connection_name = ""
enable_auto_build = false

# ========================================
# Labels
# ========================================
labels = {
  managed_by  = "terraform"
  application = "dd-ops"
  environment = "test"
  purpose     = "terraform-testing"
  customer    = "spring-firefly"
}

# ========================================
# Budget (テスト用に低額設定)
# ========================================
budget_amount = 50  # $50/month

# ========================================
# Feature Flags (テスト用に無効化)
# ========================================
enable_cloud_armor              = false
enable_private_service_connect = false
enable_deletion_protection     = false  # テスト用に無効化
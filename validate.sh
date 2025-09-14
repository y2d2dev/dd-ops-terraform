#!/bin/bash
set -e

# DD-OPS Terraform Validation Script
# Terraformコードの設定が正しいかを検証するスクリプト

echo "🔍 DD-OPS Terraform 設定検証を開始します..."

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# terraform.tfvarsの検証
validate_terraform_vars() {
    log_info "terraform.tfvarsを検証中..."

    if [ ! -f "terraform.tfvars" ]; then
        log_error "terraform.tfvarsが見つかりません"
        return 1
    fi

    local required_vars=(
        "project_id"
        "sub_domain"
        "github_owner"
        "github_repo"
    )

    local missing_vars=()
    local example_values=()

    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}.*=" terraform.tfvars; then
            missing_vars+=("$var")
        elif grep -q "^${var}.*=.*\".*your-.*\"" terraform.tfvars || \
             grep -q "^${var}.*=.*\".*example.*\"" terraform.tfvars || \
             grep -q "^${var}.*=.*\".*my-gcp-project-123.*\"" terraform.tfvars || \
             grep -q "^${var}.*=.*\".*demo.*\"" terraform.tfvars; then
            example_values+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "以下の必須変数が設定されていません:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi

    if [ ${#example_values[@]} -ne 0 ]; then
        log_warning "以下の変数がサンプル値のままです："
        for var in "${example_values[@]}"; do
            echo "  - $var"
        done
        log_warning "実際の値に変更することを推奨します"
    fi

    log_success "terraform.tfvarsの検証完了"
}

# Terraformの構文チェック
validate_terraform_syntax() {
    log_info "Terraform構文をチェック中..."

    terraform fmt -check=true -diff=true

    terraform validate

    log_success "Terraform構文チェック完了"
}

# GCPプロジェクトの権限チェック
check_gcp_permissions() {
    log_info "GCP権限をチェック中..."

    local project_id=$(grep "^project_id" terraform.tfvars | sed 's/.*=\s*"\(.*\)".*/\1/')

    if [ -z "$project_id" ]; then
        log_error "terraform.tfvarsからproject_idを取得できません"
        return 1
    fi

    # プロジェクトへのアクセス確認
    if ! gcloud projects describe "$project_id" >/dev/null 2>&1; then
        log_error "プロジェクト $project_id にアクセスできません"
        log_info "以下を確認してください:"
        echo "  1. プロジェクトIDが正しいか"
        echo "  2. 適切な権限があるか"
        echo "  3. gcloud auth loginが完了しているか"
        return 1
    fi

    log_success "GCPプロジェクトへのアクセス確認完了"
}

# 推奨設定のチェック
check_recommended_settings() {
    log_info "推奨設定をチェック中..."

    # リージョン設定
    local region=$(grep "^region" terraform.tfvars | sed 's/.*=\s*"\(.*\)".*/\1/' || echo "asia-northeast1")
    if [ "$region" != "asia-northeast1" ]; then
        log_warning "リージョンが asia-northeast1 以外に設定されています: $region"
        log_info "日本のユーザーには asia-northeast1 を推奨します"
    fi

    # 環境名の確認
    local environment=$(grep "^environment" terraform.tfvars | sed 's/.*=\s*"\(.*\)".*/\1/' || echo "prod")
    if [ "$environment" == "prod" ]; then
        log_warning "環境が 'prod' に設定されています"
        log_info "テスト環境では 'dev' または 'staging' を推奨します"
    fi

    log_success "推奨設定チェック完了"
}

# 出力先の確認
check_outputs() {
    log_info "期待される出力を確認中..."

    # 主要な出力値が定義されているか確認
    if ! grep -q "output.*load_balancer_ip" outputs.tf; then
        log_warning "load_balancer_ip の出力が定義されていません"
    fi

    if ! grep -q "output.*artifact_registry_url" outputs.tf; then
        log_warning "artifact_registry_url の出力が定義されていません"
    fi

    log_success "出力設定確認完了"
}

# セキュリティ設定の確認
check_security_settings() {
    log_info "セキュリティ設定をチェック中..."

    # SSL必須設定
    local require_ssl=$(grep "^require_ssl" terraform.tfvars | sed 's/.*=\s*\(.*\)/\1/' || echo "true")
    if [ "$require_ssl" != "true" ]; then
        log_warning "require_ssl が false に設定されています"
        log_info "本番環境では SSL を必須にすることを強く推奨します"
    fi

    # 削除保護
    local deletion_protection=$(grep "^enable_deletion_protection" terraform.tfvars | sed 's/.*=\s*\(.*\)/\1/' || echo "true")
    if [ "$deletion_protection" != "true" ]; then
        log_warning "削除保護が無効になっています"
        log_info "本番環境では削除保護を有効にすることを推奨します"
    fi

    log_success "セキュリティ設定チェック完了"
}

# 完了メッセージ
show_validation_summary() {
    echo ""
    echo "📋 検証サマリー"
    echo "=================================="
    log_success "Terraform設定の検証が完了しました"
    echo ""
    echo "次のステップ:"
    echo "1. 警告がある場合は設定を見直してください"
    echo "2. 準備ができたら ./setup.sh を実行してください"
    echo ""
}

# エラーハンドリング
handle_validation_error() {
    log_error "検証中にエラーが発生しました"
    echo ""
    echo "よくある問題と解決方法:"
    echo "1. terraform.tfvars が正しく設定されているか確認"
    echo "2. GCPプロジェクトにアクセス権限があるか確認"
    echo "3. gcloud auth login が完了しているか確認"
    echo ""
    exit 1
}

# メイン実行
main() {
    # エラー時のハンドリングを設定
    trap handle_validation_error ERR

    echo "DD-OPS Terraform Validation Script v1.0"
    echo "======================================"
    echo ""

    validate_terraform_vars
    validate_terraform_syntax
    check_gcp_permissions
    check_recommended_settings
    check_outputs
    check_security_settings
    show_validation_summary
}

# スクリプト実行
main "$@"
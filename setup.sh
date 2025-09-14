#!/bin/bash
set -e

# DD-OPS Terraform Setup Script
# このスクリプトは新しいGCPアカウントでDD-OPS環境を簡単にセットアップするためのものです

echo "🚀 DD-OPS Terraform セットアップを開始します..."

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

# 必要なツールの確認
check_prerequisites() {
    log_info "必要なツールをチェック中..."

    local missing_tools=()

    if ! command -v gcloud &> /dev/null; then
        missing_tools+=("gcloud")
    fi

    if ! command -v terraform &> /dev/null; then
        missing_tools+=("terraform")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "以下のツールがインストールされていません:"
        for tool in "${missing_tools[@]}"; do
            echo "  - $tool"
        done
        echo ""
        echo "インストール方法:"
        echo "  - gcloud: https://cloud.google.com/sdk/docs/install"
        echo "  - terraform: https://learn.hashicorp.com/tutorials/terraform/install-cli"
        exit 1
    fi

    log_success "必要なツールが揃っています"
}

# GCPプロジェクトの確認
check_gcp_project() {
    log_info "GCPプロジェクトを確認中..."

    local current_project=$(gcloud config get-value project 2>/dev/null)

    if [ -z "$current_project" ]; then
        log_error "GCPプロジェクトが設定されていません"
        echo "以下のコマンドでプロジェクトを設定してください:"
        echo "  gcloud config set project YOUR_PROJECT_ID"
        exit 1
    fi

    log_success "現在のプロジェクト: $current_project"

    # プロジェクトIDを環境変数として設定
    export TF_VAR_project_id="$current_project"
}

# 必要なAPIを有効化
enable_apis() {
    log_info "必要なGCP APIを有効化中..."

    local apis=(
        "compute.googleapis.com"
        "run.googleapis.com"
        "cloudbuild.googleapis.com"
        "artifactregistry.googleapis.com"
        "sqladmin.googleapis.com"
        "secretmanager.googleapis.com"
        "pubsub.googleapis.com"
        "monitoring.googleapis.com"
        "logging.googleapis.com"
        "storage.googleapis.com"
    )

    for api in "${apis[@]}"; do
        log_info "  有効化中: $api"
        gcloud services enable "$api" --quiet
    done

    log_success "全てのAPIが有効化されました"
}

# terraform.tfvarsファイルの確認
check_terraform_vars() {
    log_info "terraform.tfvarsファイルを確認中..."

    if [ ! -f "terraform.tfvars" ]; then
        log_warning "terraform.tfvarsが見つかりません"
        log_info "terraform.tfvars.exampleからコピーしています..."

        if [ ! -f "terraform.tfvars.example" ]; then
            log_error "terraform.tfvars.exampleも見つかりません"
            exit 1
        fi

        cp terraform.tfvars.example terraform.tfvars
        log_success "terraform.tfvarsを作成しました"

        echo ""
        log_warning "⚠️  重要: terraform.tfvarsを編集して以下の値を設定してください:"
        echo "  - project_id: あなたのGCPプロジェクトID"
        echo "  - sub_domain: 環境名（例: demo, staging, client-a）"
        echo "  - github_owner: GitHubユーザー名/組織名"
        echo "  - github_repo: リポジトリ名"
        echo ""
        read -p "terraform.tfvarsの編集が完了したらEnterキーを押してください..." -n1 -s
        echo ""
    else
        log_success "terraform.tfvarsが存在します"
    fi
}

# Terraformの初期化
init_terraform() {
    log_info "Terraformを初期化中..."

    terraform init

    log_success "Terraformの初期化完了"
}

# Terraform計画の実行
plan_terraform() {
    log_info "Terraform計画を実行中..."

    terraform plan -out=tfplan

    log_success "Terraform計画完了"

    echo ""
    log_warning "上記の計画を確認してください"
    read -p "この計画を実行してよろしいですか？ (y/N): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "セットアップを中断しました"
        rm -f tfplan
        exit 0
    fi
}

# Terraformの適用
apply_terraform() {
    log_info "Terraformを適用中..."

    terraform apply tfplan

    rm -f tfplan

    log_success "Terraformの適用完了！"
}

# GitHub連携の案内
show_github_setup_instructions() {
    echo ""
    echo "🔗 GitHub連携の設定"
    echo "=================================="
    log_warning "Cloud Buildとの連携は手動設定が必要です"
    echo ""
    echo "1. Google Cloud Consoleにアクセス:"
    echo "   https://console.cloud.google.com/cloud-build/triggers"
    echo ""
    echo "2. 「リポジトリを接続」をクリック"
    echo "3. GitHubを選択してリポジトリを接続"
    echo "4. 認証を完了"
    echo ""
    echo "詳細: https://cloud.google.com/build/docs/automating-builds/github/connect-repo-github"
    echo ""
}

# 完了メッセージ
show_completion_message() {
    echo ""
    echo "🎉 セットアップ完了！"
    echo "=================================="

    # 出力値を表示
    log_info "作成されたリソースの情報:"
    terraform output

    echo ""
    log_success "DD-OPS環境が正常に作成されました！"
    echo ""
    echo "次のステップ:"
    echo "1. GitHub連携を設定（上記の手順を参照）"
    echo "2. アプリケーションコードをプッシュしてビルドをテスト"
    echo "3. ドメインのDNS設定（dd-ops.netのサブドメイン）"
    echo ""
}

# エラーハンドリング
cleanup_on_error() {
    log_error "セットアップ中にエラーが発生しました"
    rm -f tfplan
    exit 1
}

# メイン実行
main() {
    # エラー時のクリーンアップを設定
    trap cleanup_on_error ERR

    echo "DD-OPS Terraform Setup Script v1.0"
    echo "=================================="
    echo ""

    check_prerequisites
    check_gcp_project
    enable_apis
    check_terraform_vars
    init_terraform
    plan_terraform
    apply_terraform
    show_github_setup_instructions
    show_completion_message
}

# スクリプト実行
main "$@"
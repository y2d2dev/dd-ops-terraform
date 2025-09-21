# 顧客ごとの設定を定義
variable "customers" {
  description = "Customer configurations"
  type = map(object({
    enabled      = bool
    environment  = string
    bucket_name  = string
    ocr_api_url  = string
    jwt_secret   = string
    database_url = string
  }))
  default = {
    "customer-a" = {
      enabled      = true
      environment  = "production"
      bucket_name  = "customer-a-contracts"
      ocr_api_url  = "https://ocr-api-customer-a.run.app"
      jwt_secret   = "customer-a-secret-key"
      database_url = "postgresql://customer-a-db:5432/app"
    }
    "customer-b" = {
      enabled      = true
      environment  = "production"
      bucket_name  = "customer-b-contracts"
      ocr_api_url  = "https://ocr-api-customer-b.run.app"
      jwt_secret   = "customer-b-secret-key"
      database_url = "postgresql://customer-b-db:5432/app"
    }
  }
}

# 各顧客用のCloud Runサービスをデプロイ
resource "google_cloud_run_v2_service" "customer_file_upload" {
  for_each = { for k, v in var.customers : k => v if v.enabled }

  name     = "file-upload-${each.key}"
  location = var.region
  project  = var.project_id

  template {
    containers {
      # ビルド済みの共通イメージを使用
      image = local.container_images.file_upload

      # 顧客ごとの環境変数を上書き
      env {
        name  = "NEXT_PUBLIC_BUCKET_NAME"
        value = each.value.bucket_name
      }

      env {
        name  = "NEXT_PUBLIC_OCR_API_URL"
        value = each.value.ocr_api_url
      }

      env {
        name  = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.customer_secrets[each.key].secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.customer_db_urls[each.key].secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      ports {
        container_port = 8080
        name           = "http1"
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 100
    }

    service_account = google_service_account.customer_sa[each.key].email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# 顧客ごとのSecret Manager
resource "google_secret_manager_secret" "customer_secrets" {
  for_each  = var.customers
  secret_id = "${each.key}-jwt-secret"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "customer_secret_versions" {
  for_each = var.customers
  secret   = google_secret_manager_secret.customer_secrets[each.key].id
  secret_data = each.value.jwt_secret
}

resource "google_secret_manager_secret" "customer_db_urls" {
  for_each  = var.customers
  secret_id = "${each.key}-database-url"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "customer_db_url_versions" {
  for_each = var.customers
  secret   = google_secret_manager_secret.customer_db_urls[each.key].id
  secret_data = each.value.database_url
}

# 顧客ごとのService Account
resource "google_service_account" "customer_sa" {
  for_each     = var.customers
  account_id   = "${each.key}-sa"
  display_name = "Service Account for ${each.key}"
  project      = var.project_id
}

# 顧客ごとのSecret Manager権限
resource "google_secret_manager_secret_iam_member" "customer_secret_access" {
  for_each  = var.customers
  secret_id = google_secret_manager_secret.customer_secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.customer_sa[each.key].email}"
  project   = var.project_id
}

resource "google_secret_manager_secret_iam_member" "customer_db_secret_access" {
  for_each  = var.customers
  secret_id = google_secret_manager_secret.customer_db_urls[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.customer_sa[each.key].email}"
  project   = var.project_id
}

# Public access for customer file-upload services
resource "google_cloud_run_v2_service_iam_member" "customer_file_upload_public" {
  for_each = var.customers

  name     = google_cloud_run_v2_service.customer_file_upload[each.key].name
  location = google_cloud_run_v2_service.customer_file_upload[each.key].location
  project  = google_cloud_run_v2_service.customer_file_upload[each.key].project
  role     = "roles/run.invoker"
  member   = "allUsers"
}
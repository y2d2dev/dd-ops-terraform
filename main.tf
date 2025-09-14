# DD-OPS Terraform Configuration
# Production Environment Resources

# ========================================
# Project Configuration
# ========================================
data "google_project" "main" {
  project_id = var.project_id
}

# ========================================
# Local Values
# ========================================
locals {
  # Dynamic domain construction
  full_domain  = "${var.sub_domain}.${var.base_domain}"
  www_domain   = "www.${var.sub_domain}.${var.base_domain}"
  domains      = [local.full_domain, local.www_domain]
  cors_origins = ["https://${local.full_domain}"]

  # Dynamic container image paths
  # Currently uses variables, but will be enhanced to use Artifact Registry references
  container_images = {
    dd_ops        = var.dd_ops_image
    ocr_api       = var.ocr_api_image
    file_upload   = var.file_upload_image
    get_file_path = var.get_file_path_image
  }
}

# ========================================
# Networking Resources
# ========================================

# VPC Network
resource "google_compute_network" "main_vpc" {
  name                    = "${var.environment}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  project                 = var.project_id
}

# Subnetworks
resource "google_compute_subnetwork" "main_subnet" {
  name          = "${var.environment}-subnet"
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.main_vpc.id
  project       = var.project_id

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_MIN"
    flow_sampling        = 0.5
  }
}

# ========================================
# Private Service Connection (for Cloud SQL)
# ========================================

# Private IP allocation for Google services
resource "google_compute_global_address" "private_ip_peering" {
  name          = "${var.environment}-private-ip-peering"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main_vpc.id
  project       = var.project_id
}

# Private connection to Google services
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_peering.name]
}

# ========================================
# Cloud Run Services
# ========================================

# DD-OPS Main Application
resource "google_cloud_run_v2_service" "dd_ops" {
  name     = "dd-ops"
  location = var.region
  project  = var.project_id

  depends_on = [
    google_project_iam_member.dd_ops_permissions,
    google_secret_manager_secret.database_url
  ]

  template {
    containers {
      image = local.container_images.dd_ops

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
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

    service_account = google_service_account.dd_ops_sa.email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# OCR API Service
resource "google_cloud_run_v2_service" "ocr_api" {
  name     = "dd-ops-ocr-api-v2"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = local.container_images.ocr_api

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.app_contracts.name
      }

      env {
        name  = "DD_OPS_MODELS_BUCKET"
        value = google_storage_bucket.dd_ops_models.name
      }

      resources {
        limits = {
          cpu    = "4"
          memory = "8Gi"
        }
        cpu_idle          = false
        startup_cpu_boost = true
      }

      ports {
        container_port = 8080
        name           = "http1"
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    service_account = google_service_account.dd_ops_sa.email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# File Upload Service
resource "google_cloud_run_v2_service" "file_upload" {
  name     = "file-upload-app"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = local.container_images.file_upload

      env {
        name  = "NEXT_PUBLIC_BUCKET_NAME"
        value = google_storage_bucket.app_contracts.name
      }

      env {
        name  = "GOOGLE_CLOUD_STORAGE_BUCKET"
        value = google_storage_bucket.app_contracts.name
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

    service_account = google_service_account.file_upload_sa.email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Get File Path Service
resource "google_cloud_run_v2_service" "get_file_path" {
  name     = "get-file-path"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = local.container_images.get_file_path

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

    service_account = google_service_account.dd_ops_sa.email

    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"

      network_interfaces {
        network    = google_compute_network.main_vpc.name
        subnetwork = google_compute_subnetwork.main_subnet.name
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# ========================================
# Cloud SQL Instance
# ========================================

resource "google_sql_database_instance" "main" {
  name             = "dd-ops-db"
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = var.db_disk_size
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = var.environment == "prod"
      transaction_log_retention_days = var.environment == "prod" ? 7 : 1
      backup_retention_settings {
        retained_backups = var.environment == "prod" ? 30 : 7
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main_vpc.id
      require_ssl     = true
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }

    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }

    maintenance_window {
      day          = 7
      hour         = 4
      update_track = "stable"
    }
  }

  deletion_protection = var.environment == "prod"
}

resource "google_sql_database" "main" {
  name     = "dd_ops"
  instance = google_sql_database_instance.main.name
  project  = var.project_id
}

resource "google_sql_user" "app_user" {
  name     = "dd_ops_user"
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
  project  = var.project_id
}

# ========================================
# Storage Buckets
# ========================================

# Application Contracts Bucket
resource "google_storage_bucket" "app_contracts" {
  name     = "app-contracts"
  location = upper(var.region)
  project  = var.project_id

  uniform_bucket_level_access = true
  force_destroy               = false

  cors {
    origin          = local.cors_origins
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type", "Content-Length", "Content-Disposition", "x-goog-meta-*"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  versioning {
    enabled = true
  }
}

# DD-OPS Models Bucket
resource "google_storage_bucket" "dd_ops_models" {
  name     = "dd-ops-models"
  location = upper(var.region)
  project  = var.project_id

  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }
}

# ========================================
# Service Accounts
# ========================================

resource "google_service_account" "dd_ops_sa" {
  account_id   = "dd-ops"
  display_name = "DD-OPS Service Account"
  project      = var.project_id
}

resource "google_service_account" "file_upload_sa" {
  account_id   = "file-upload"
  display_name = "File Upload Service Account"
  project      = var.project_id
}

resource "google_service_account" "storage_url_signer" {
  account_id   = "storage-url-signer"
  display_name = "Storage URL Signer"
  project      = var.project_id
}

# ========================================
# IAM Bindings
# ========================================

# DD-OPS Service Account Permissions
resource "google_project_iam_member" "dd_ops_permissions" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/storage.objectViewer",
    "roles/storage.objectCreator",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.dd_ops_sa.email}"
}

# File Upload Service Account Permissions
resource "google_project_iam_member" "file_upload_permissions" {
  for_each = toset([
    "roles/storage.objectAdmin",
    "roles/logging.logWriter",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.file_upload_sa.email}"
}

# Storage URL Signer Permissions
resource "google_storage_bucket_iam_member" "url_signer_access" {
  bucket = google_storage_bucket.app_contracts.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.storage_url_signer.email}"
}

# ========================================
# Pub/Sub Resources
# ========================================

resource "google_pubsub_topic" "ocr" {
  name    = "ocr-${var.environment}"
  project = var.project_id

  message_retention_duration = "86400s"
}

resource "google_pubsub_topic" "ocr_dlq" {
  name    = "ocr-${var.environment}-dlq"
  project = var.project_id
}

resource "google_pubsub_subscription" "ocr" {
  name    = "ocr-subscription-${var.environment}"
  topic   = google_pubsub_topic.ocr.name
  project = var.project_id

  ack_deadline_seconds = 600

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.ocr_dlq.id
    max_delivery_attempts = 5
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  expiration_policy {
    ttl = ""
  }
}

# ========================================
# Secret Manager
# ========================================

resource "google_secret_manager_secret" "database_url" {
  secret_id = "database-url"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url" {
  secret = google_secret_manager_secret.database_url.id

  secret_data = format(
    "postgresql://%s:%s@%s:5432/%s",
    google_sql_user.app_user.name,
    random_password.db_password.result,
    google_sql_database_instance.main.private_ip_address,
    google_sql_database.main.name
  )

  lifecycle {
    replace_triggered_by = [
      google_sql_database_instance.main,
      google_sql_user.app_user,
      random_password.db_password
    ]
  }
}

# ========================================
# Load Balancer and CDN
# ========================================

# Backend Bucket for Static Content
resource "google_compute_backend_bucket" "app_contracts_backend" {
  name        = "app-contracts-backend"
  bucket_name = google_storage_bucket.app_contracts.name
  project     = var.project_id

  enable_cdn = true

  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    default_ttl                  = 3600
    max_ttl                      = 86400
    client_ttl                   = 3600
    negative_caching             = true
    serve_while_stale            = 86400
    signed_url_cache_max_age_sec = 3600
  }
}

# URL Map
resource "google_compute_url_map" "main" {
  name            = "${var.environment}-lb"
  default_service = google_compute_backend_bucket.app_contracts_backend.id
  project         = var.project_id

  host_rule {
    hosts        = local.domains
    path_matcher = "main-paths"
  }

  path_matcher {
    name            = "main-paths"
    default_service = google_compute_backend_bucket.app_contracts_backend.id

    path_rule {
      paths   = ["/api/*"]
      service = google_compute_backend_service.dd_ops_backend.id
    }

    path_rule {
      paths   = ["/pdf/*"]
      service = google_compute_backend_bucket.app_contracts_backend.id
    }
  }
}

# Backend Service for Cloud Run
resource "google_compute_backend_service" "dd_ops_backend" {
  name    = "dd-ops-backend-${var.environment}"
  project = var.project_id

  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30

  backend {
    group = google_compute_region_network_endpoint_group.dd_ops_neg.id
  }
}

# Network Endpoint Group for Cloud Run
resource "google_compute_region_network_endpoint_group" "dd_ops_neg" {
  name                  = "dd-ops-neg-${var.environment}"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  project               = var.project_id

  cloud_run {
    service = google_cloud_run_v2_service.dd_ops.name
  }
}

# Health Check
resource "google_compute_health_check" "http" {
  name    = "http-health-check-${var.environment}"
  project = var.project_id

  timeout_sec         = 5
  check_interval_sec  = 10
  healthy_threshold   = 2
  unhealthy_threshold = 3

  http_health_check {
    port         = 80
    request_path = "/health"
  }
}

# SSL Certificate
resource "google_compute_managed_ssl_certificate" "main" {
  name    = "${var.environment}-ssl-cert"
  project = var.project_id

  managed {
    domains = local.domains
  }
}

# HTTPS Proxy
resource "google_compute_target_https_proxy" "main" {
  name             = "${var.environment}-https-proxy"
  url_map          = google_compute_url_map.main.id
  ssl_certificates = [google_compute_managed_ssl_certificate.main.id]
  project          = var.project_id
}

# Global Forwarding Rule
resource "google_compute_global_forwarding_rule" "main" {
  name       = "${var.environment}-forwarding-rule"
  target     = google_compute_target_https_proxy.main.id
  port_range = "443"
  project    = var.project_id
}

# ========================================
# Monitoring and Alerting
# ========================================

resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "High Error Rate - ${var.environment}"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Error rate above 1%"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.01

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = var.notification_channels

  alert_strategy {
    auto_close = "86400s"
  }
}

# ========================================
# Helper Resources
# ========================================

resource "random_password" "db_password" {
  length  = 32
  special = true
}
# ========================================
# Project and Environment Variables
# ========================================

variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "reflected-flux-462908-s6"
}

variable "environment" {
  description = "Environment name (prod, dev, etc.)"
  type        = string
  default     = "prod"
  validation {
    condition     = contains(["prod", "dev", "staging"], var.environment)
    error_message = "Environment must be prod, dev, or staging."
  }
}

variable "region" {
  description = "The primary GCP region"
  type        = string
  default     = "asia-northeast1"
}

variable "zone" {
  description = "The primary GCP zone"
  type        = string
  default     = "asia-northeast1-a"
}

# ========================================
# Networking Variables
# ========================================

variable "subnet_cidr" {
  description = "CIDR range for the main subnet"
  type        = string
  default     = "10.0.0.0/24"
}

variable "enable_private_google_access" {
  description = "Enable private Google access for subnet"
  type        = bool
  default     = true
}

# ========================================
# Cloud Run Variables
# ========================================

variable "dd_ops_image" {
  description = "Docker image for DD-OPS main application"
  type        = string
  default     = "asia-northeast1-docker.pkg.dev/reflected-flux-462908-s6/cloud-run-source-deploy/dd-ops:latest"
}

variable "ocr_api_image" {
  description = "Docker image for OCR API service"
  type        = string
  default     = "asia-northeast1-docker.pkg.dev/reflected-flux-462908-s6/cloud-run-source-deploy/dd-ops-ocr-api-v2:latest"
}

variable "file_upload_image" {
  description = "Docker image for file upload service"
  type        = string
  default     = "asia-northeast1-docker.pkg.dev/reflected-flux-462908-s6/cloud-run-source-deploy/file-upload-app:latest"
}

variable "get_file_path_image" {
  description = "Docker image for get file path service"
  type        = string
  default     = "asia-northeast1-docker.pkg.dev/reflected-flux-462908-s6/cloud-run-source-deploy/get-file-path:latest"
}

variable "cloud_run_cpu_limit" {
  description = "CPU limit for Cloud Run services"
  type        = map(string)
  default = {
    dd_ops        = "2"
    ocr_api       = "4"
    file_upload   = "1"
    get_file_path = "1"
  }
}

variable "cloud_run_memory_limit" {
  description = "Memory limit for Cloud Run services"
  type        = map(string)
  default = {
    dd_ops        = "1Gi"
    ocr_api       = "1Gi"
    file_upload   = "512Mi"
    get_file_path = "512Mi"
  }
}

variable "cloud_run_max_instances" {
  description = "Maximum instances for Cloud Run services"
  type        = map(number)
  default = {
    dd_ops        = 100
    ocr_api       = 10
    file_upload   = 100
    get_file_path = 100
  }
}

variable "cloud_run_min_instances" {
  description = "Minimum instances for Cloud Run services"
  type        = map(number)
  default = {
    dd_ops        = 0
    ocr_api       = 1
    file_upload   = 0
    get_file_path = 0
  }
}

variable "cloud_run_concurrency" {
  description = "Maximum concurrent requests per instance"
  type        = number
  default     = 80
}

# ========================================
# Cloud SQL Variables
# ========================================

variable "db_tier" {
  description = "The machine type for the database instance"
  type        = string
  default     = "db-custom-2-7680"
}

variable "db_disk_size" {
  description = "The disk size for the database instance in GB"
  type        = number
  default     = 100
}

variable "db_disk_type" {
  description = "The disk type for the database instance"
  type        = string
  default     = "PD_SSD"
}

variable "db_backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "db_backup_start_time" {
  description = "Start time for automated backups (HH:MM format)"
  type        = string
  default     = "03:00"
}

variable "db_maintenance_window_day" {
  description = "Day of week for maintenance window (1-7, 1 = Monday)"
  type        = number
  default     = 7
}

variable "db_maintenance_window_hour" {
  description = "Hour of day for maintenance window (0-23)"
  type        = number
  default     = 4
}

variable "db_max_connections" {
  description = "Maximum number of connections to the database"
  type        = string
  default     = "100"
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for production"
  type        = bool
  default     = true
}

# ========================================
# Storage Variables
# ========================================

variable "storage_location" {
  description = "Location for storage buckets"
  type        = string
  default     = "ASIA-NORTHEAST1"
}

variable "storage_class" {
  description = "Storage class for buckets"
  type        = string
  default     = "STANDARD"
}

variable "enable_versioning" {
  description = "Enable versioning for storage buckets"
  type        = bool
  default     = true
}

variable "lifecycle_age_days" {
  description = "Number of days before objects are deleted"
  type        = number
  default     = 90
}

variable "cors_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["https://dd-ops.net"]
}

variable "cors_methods" {
  description = "CORS allowed methods"
  type        = list(string)
  default     = ["GET", "HEAD", "OPTIONS"]
}

# ========================================
# Load Balancer Variables
# ========================================

variable "domains" {
  description = "Domain names for SSL certificate and load balancer"
  type        = list(string)
  default     = ["dd-ops.net", "www.dd-ops.net"]
}

variable "ssl_policy" {
  description = "SSL policy for HTTPS load balancer"
  type        = string
  default     = "MODERN"
}

variable "cdn_cache_mode" {
  description = "CDN cache mode"
  type        = string
  default     = "CACHE_ALL_STATIC"
}

variable "cdn_default_ttl" {
  description = "Default TTL for CDN cache in seconds"
  type        = number
  default     = 3600
}

variable "cdn_max_ttl" {
  description = "Maximum TTL for CDN cache in seconds"
  type        = number
  default     = 86400
}

# ========================================
# Service Account Variables
# ========================================

variable "create_service_accounts" {
  description = "Whether to create new service accounts"
  type        = bool
  default     = true
}

variable "service_account_roles" {
  description = "Roles to assign to service accounts"
  type        = map(list(string))
  default = {
    dd_ops = [
      "roles/cloudsql.client",
      "roles/storage.objectViewer",
      "roles/storage.objectCreator",
      "roles/secretmanager.secretAccessor",
      "roles/logging.logWriter",
      "roles/monitoring.metricWriter",
    ]
    file_upload = [
      "roles/storage.objectAdmin",
      "roles/logging.logWriter",
    ]
    storage_url_signer = [
      "roles/storage.objectAdmin",
    ]
  }
}

# ========================================
# Pub/Sub Variables
# ========================================

variable "pubsub_message_retention" {
  description = "Message retention duration for Pub/Sub topics"
  type        = string
  default     = "86400s"
}

variable "pubsub_ack_deadline" {
  description = "Acknowledgment deadline for Pub/Sub subscriptions in seconds"
  type        = number
  default     = 600
}

variable "pubsub_max_delivery_attempts" {
  description = "Maximum delivery attempts before sending to DLQ"
  type        = number
  default     = 5
}

variable "pubsub_min_backoff" {
  description = "Minimum backoff for retry policy"
  type        = string
  default     = "10s"
}

variable "pubsub_max_backoff" {
  description = "Maximum backoff for retry policy"
  type        = string
  default     = "600s"
}

# ========================================
# Monitoring Variables
# ========================================

variable "enable_monitoring" {
  description = "Enable monitoring and alerting"
  type        = bool
  default     = true
}

variable "notification_channels" {
  description = "List of notification channel IDs for alerts"
  type        = list(string)
  default     = []
}

variable "alert_error_rate_threshold" {
  description = "Error rate threshold for alerting (as percentage)"
  type        = number
  default     = 1.0
}

variable "alert_duration" {
  description = "Duration for alert condition in seconds"
  type        = string
  default     = "300s"
}

variable "alert_auto_close" {
  description = "Auto-close duration for alerts"
  type        = string
  default     = "86400s"
}

# ========================================
# Security Variables
# ========================================

variable "enable_vpc_flow_logs" {
  description = "Enable VPC flow logs"
  type        = bool
  default     = true
}

variable "flow_logs_sampling" {
  description = "Sampling rate for flow logs (0.0 to 1.0)"
  type        = number
  default     = 0.5
}

variable "require_ssl" {
  description = "Require SSL for database connections"
  type        = bool
  default     = true
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = true
}

# ========================================
# Tags and Labels
# ========================================

variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default = {
    managed_by  = "terraform"
    application = "dd-ops"
  }
}

variable "resource_tags" {
  description = "Additional tags for specific resource types"
  type        = map(map(string))
  default = {
    cloud_run = {
      type = "compute"
    }
    storage = {
      type = "storage"
    }
    database = {
      type = "database"
    }
  }
}

# ========================================
# Budget and Cost Variables
# ========================================

variable "budget_amount" {
  description = "Monthly budget amount in USD"
  type        = number
  default     = 1000
}

variable "budget_alert_thresholds" {
  description = "Budget alert threshold percentages"
  type        = list(number)
  default     = [50, 80, 100, 120]
}

# ========================================
# Backup and Recovery Variables
# ========================================

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "transaction_log_retention_days" {
  description = "Number of days to retain transaction logs"
  type        = number
  default     = 7
}

# ========================================
# Feature Flags
# ========================================

variable "enable_cdn" {
  description = "Enable Cloud CDN"
  type        = bool
  default     = true
}

variable "enable_cloud_armor" {
  description = "Enable Cloud Armor DDoS protection"
  type        = bool
  default     = false
}

variable "enable_private_service_connect" {
  description = "Enable Private Service Connect"
  type        = bool
  default     = false
}
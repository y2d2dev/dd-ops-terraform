# ========================================
# Cloud Run Service Outputs
# ========================================

output "cloud_run_urls" {
  description = "URLs for Cloud Run services"
  value = {
    dd_ops        = google_cloud_run_v2_service.dd_ops.uri
    ocr_api       = google_cloud_run_v2_service.ocr_api.uri
    file_upload   = google_cloud_run_v2_service.file_upload.uri
    get_file_path = google_cloud_run_v2_service.get_file_path.uri
  }
}

output "cloud_run_service_names" {
  description = "Names of Cloud Run services"
  value = {
    dd_ops        = google_cloud_run_v2_service.dd_ops.name
    ocr_api       = google_cloud_run_v2_service.ocr_api.name
    file_upload   = google_cloud_run_v2_service.file_upload.name
    get_file_path = google_cloud_run_v2_service.get_file_path.name
  }
}

# ========================================
# Database Outputs
# ========================================

output "database_instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.main.name
}

output "database_connection_name" {
  description = "Connection name for the Cloud SQL instance"
  value       = google_sql_database_instance.main.connection_name
}

output "database_private_ip" {
  description = "Private IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.main.private_ip_address
  sensitive   = true
}

output "database_name" {
  description = "Name of the database"
  value       = google_sql_database.main.name
}

# ========================================
# Storage Outputs
# ========================================

output "storage_buckets" {
  description = "Names of storage buckets"
  value = {
    app_contracts = google_storage_bucket.app_contracts.name
    dd_ops_models = google_storage_bucket.dd_ops_models.name
  }
}

output "storage_bucket_urls" {
  description = "URLs of storage buckets"
  value = {
    app_contracts = google_storage_bucket.app_contracts.url
    dd_ops_models = google_storage_bucket.dd_ops_models.url
  }
}

# ========================================
# Network Outputs
# ========================================

output "vpc_network_name" {
  description = "Name of the VPC network"
  value       = google_compute_network.main_vpc.name
}

output "vpc_network_id" {
  description = "ID of the VPC network"
  value       = google_compute_network.main_vpc.id
}

output "subnet_name" {
  description = "Name of the subnet"
  value       = google_compute_subnetwork.main_subnet.name
}

output "subnet_cidr" {
  description = "CIDR range of the subnet"
  value       = google_compute_subnetwork.main_subnet.ip_cidr_range
}

# ========================================
# Load Balancer Outputs
# ========================================

output "load_balancer_ip" {
  description = "IP address of the global load balancer"
  value       = google_compute_global_forwarding_rule.main.ip_address
}

output "load_balancer_url" {
  description = "URL of the load balancer"
  value       = "https://${var.domains[0]}"
}

output "ssl_certificate_name" {
  description = "Name of the SSL certificate"
  value       = google_compute_managed_ssl_certificate.main.name
}

# ========================================
# Service Account Outputs
# ========================================

output "service_account_emails" {
  description = "Email addresses of service accounts"
  value = {
    dd_ops             = google_service_account.dd_ops_sa.email
    file_upload        = google_service_account.file_upload_sa.email
    storage_url_signer = google_service_account.storage_url_signer.email
  }
}

output "service_account_ids" {
  description = "IDs of service accounts"
  value = {
    dd_ops             = google_service_account.dd_ops_sa.id
    file_upload        = google_service_account.file_upload_sa.id
    storage_url_signer = google_service_account.storage_url_signer.id
  }
}

# ========================================
# Pub/Sub Outputs
# ========================================

output "pubsub_topics" {
  description = "Names of Pub/Sub topics"
  value = {
    ocr     = google_pubsub_topic.ocr.name
    ocr_dlq = google_pubsub_topic.ocr_dlq.name
  }
}

output "pubsub_subscription_name" {
  description = "Name of the Pub/Sub subscription"
  value       = google_pubsub_subscription.ocr.name
}

# ========================================
# Secret Manager Outputs
# ========================================

output "secret_ids" {
  description = "IDs of secrets in Secret Manager"
  value = {
    database_url = google_secret_manager_secret.database_url.secret_id
  }
}

# ========================================
# Monitoring Outputs
# ========================================

output "alert_policy_names" {
  description = "Names of monitoring alert policies"
  value = {
    high_error_rate = google_monitoring_alert_policy.high_error_rate.name
  }
}

# ========================================
# Project Information
# ========================================

output "project_id" {
  description = "GCP project ID"
  value       = var.project_id
}

output "region" {
  description = "Primary GCP region"
  value       = var.region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# ========================================
# Backend Service Outputs
# ========================================

output "backend_service_names" {
  description = "Names of backend services"
  value = {
    dd_ops_backend    = google_compute_backend_service.dd_ops_backend.name
    app_contracts_cdn = google_compute_backend_bucket.app_contracts_backend.name
  }
}

# ========================================
# Health Check Outputs
# ========================================

output "health_check_name" {
  description = "Name of the health check"
  value       = google_compute_health_check.http.name
}

# ========================================
# NEG Outputs
# ========================================

output "network_endpoint_group_name" {
  description = "Name of the network endpoint group"
  value       = google_compute_region_network_endpoint_group.dd_ops_neg.name
}
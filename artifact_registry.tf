# ========================================
# Artifact Registry Resources
# ========================================

# Docker Repository for Application Images
resource "google_artifact_registry_repository" "app_images" {
  location      = var.region
  repository_id = "app-images"
  description   = "Docker repository for DD-OPS application images"
  format        = "DOCKER"
  project       = var.project_id

  labels = var.labels
}

# Docker Repository for Base Images (optional, for custom base images)
resource "google_artifact_registry_repository" "base_images" {
  location      = var.region
  repository_id = "base-images"
  description   = "Docker repository for custom base images"
  format        = "DOCKER"
  project       = var.project_id

  labels = var.labels
}

# ========================================
# IAM Permissions for Artifact Registry
# ========================================

# Allow Cloud Build to push to Artifact Registry
resource "google_artifact_registry_repository_iam_member" "cloud_build_writer" {
  project    = var.project_id
  location   = google_artifact_registry_repository.app_images.location
  repository = google_artifact_registry_repository.app_images.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${data.google_project.main.number}@cloudbuild.gserviceaccount.com"
}

# Allow Cloud Run services to pull from Artifact Registry
resource "google_artifact_registry_repository_iam_member" "cloud_run_reader" {
  for_each = {
    dd_ops      = google_service_account.dd_ops_sa.email
    file_upload = google_service_account.file_upload_sa.email
  }

  project    = var.project_id
  location   = google_artifact_registry_repository.app_images.location
  repository = google_artifact_registry_repository.app_images.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${each.value}"
}

# ========================================
# Repository Cleanup Policy
# ========================================

# Note: Cleanup policies need to be configured manually or via gcloud CLI after deployment
# Example: Keep only the last 10 versions of each image
# gcloud artifacts repositories set-cleanup-policy app-images \
#   --location=asia-northeast1 \
#   --project=${var.project_id} \
#   --policy='{"rules":[{"action":"DELETE","condition":{"versionAge":"30d"}}]}'
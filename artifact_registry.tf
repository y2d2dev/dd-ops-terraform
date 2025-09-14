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
  for_each = toset([
    google_service_account.dd_ops_sa.email,
    google_service_account.file_upload_sa.email,
  ])

  project    = var.project_id
  location   = google_artifact_registry_repository.app_images.location
  repository = google_artifact_registry_repository.app_images.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${each.value}"
}

# ========================================
# Repository Cleanup Policy
# ========================================

# Cleanup policy to keep only recent images
resource "google_artifact_registry_repository" "app_images_with_cleanup" {
  depends_on = [google_artifact_registry_repository.app_images]

  # This is a workaround since cleanup_policies can't be added directly to the repository resource
  # We'll use lifecycle rules instead
  lifecycle {
    ignore_changes = [cleanup_policies]
  }
}

# Note: Cleanup policies need to be configured manually or via gcloud CLI
# Example: Keep only the last 10 versions of each image
# gcloud artifacts repositories set-cleanup-policy app-images \
#   --location=asia-northeast1 \
#   --policy=policy.json
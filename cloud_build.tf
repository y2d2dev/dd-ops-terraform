# ========================================
# Cloud Build Resources
# ========================================

# Enable required APIs
resource "google_project_service" "cloud_build_api" {
  project = var.project_id
  service = "cloudbuild.googleapis.com"

  disable_dependent_services = false
}

resource "google_project_service" "source_manager_api" {
  project = var.project_id
  service = "sourcerepo.googleapis.com"

  disable_dependent_services = false
}

# ========================================
# GitHub Repository Connection
# ========================================

# GitHub App Connection (requires manual setup)
# Note: This needs to be created manually in the Console first
# https://cloud.google.com/build/docs/automating-builds/github/connect-repo-github

# ========================================
# Cloud Build Triggers for each service
# ========================================

# Build trigger for DD-OPS main application
resource "google_cloudbuild_trigger" "dd_ops_build" {
  project     = var.project_id
  name        = "dd-ops-${var.environment}-build"
  description = "Build DD-OPS main application on ${var.branch_name} branch changes"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^${var.branch_name}$"
    }
  }

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/dd-ops:$SHORT_SHA",
        "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/dd-ops:latest",
        "-f", var.dockerfile_paths.dd_ops,
        var.build_contexts.dd_ops
      ]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/dd-ops:$SHORT_SHA"
      ]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/dd-ops:latest"
      ]
    }
    step {
      name = "gcr.io/cloud-builders/gcloud"
      args = [
        "run", "deploy", "dd-ops-${var.environment}",
        "--image", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/dd-ops:$SHORT_SHA",
        "--region", var.region,
        "--platform", "managed",
        "--quiet"
      ]
    }
  }

  substitutions = {
    _SERVICE_NAME = "dd-ops"
  }

  depends_on = [
    google_project_service.cloud_build_api,
    google_artifact_registry_repository.app_images
  ]
}

# Build trigger for OCR API service
resource "google_cloudbuild_trigger" "ocr_api_build" {
  project     = var.project_id
  name        = "ocr-api-${var.environment}-build"
  description = "Build OCR API service on ${var.branch_name} branch changes"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^${var.branch_name}$"
    }
  }

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/ocr-api:$SHORT_SHA",
        "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/ocr-api:latest",
        "-f", var.dockerfile_paths.ocr_api,
        var.build_contexts.ocr_api
      ]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/ocr-api:$SHORT_SHA"
      ]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/ocr-api:latest"
      ]
    }
    step {
      name = "gcr.io/cloud-builders/gcloud"
      args = [
        "run", "deploy", "dd-ops-ocr-api-v2",
        "--image", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/ocr-api:$SHORT_SHA",
        "--region", var.region,
        "--platform", "managed",
        "--quiet"
      ]
    }
  }

  substitutions = {
    _SERVICE_NAME = "ocr-api"
  }

  depends_on = [
    google_project_service.cloud_build_api,
    google_artifact_registry_repository.app_images
  ]
}

# Build trigger for File Upload service
resource "google_cloudbuild_trigger" "file_upload_build" {
  project     = var.project_id
  name        = "file-upload-${var.environment}-build"
  description = "Build File Upload service on ${var.branch_name} branch changes"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^${var.branch_name}$"
    }
  }

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/file-upload:$SHORT_SHA",
        "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/file-upload:latest",
        "-f", var.dockerfile_paths.file_upload,
        var.build_contexts.file_upload
      ]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/file-upload:$SHORT_SHA"
      ]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/file-upload:latest"
      ]
    }
    step {
      name = "gcr.io/cloud-builders/gcloud"
      args = [
        "run", "deploy", "file-upload-app",
        "--image", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/file-upload:$SHORT_SHA",
        "--region", var.region,
        "--platform", "managed",
        "--quiet"
      ]
    }
  }

  substitutions = {
    _SERVICE_NAME = "file-upload"
  }

  depends_on = [
    google_project_service.cloud_build_api,
    google_artifact_registry_repository.app_images
  ]
}

# Build trigger for Get File Path service
resource "google_cloudbuild_trigger" "get_file_path_build" {
  project     = var.project_id
  name        = "get-file-path-${var.environment}-build"
  description = "Build Get File Path service on ${var.branch_name} branch changes"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^${var.branch_name}$"
    }
  }

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/get-file-path:$SHORT_SHA",
        "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/get-file-path:latest",
        "-f", var.dockerfile_paths.get_file_path,
        var.build_contexts.get_file_path
      ]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/get-file-path:$SHORT_SHA"
      ]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/get-file-path:latest"
      ]
    }
    step {
      name = "gcr.io/cloud-builders/gcloud"
      args = [
        "run", "deploy", "get-file-path",
        "--image", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_images.repository_id}/get-file-path:$SHORT_SHA",
        "--region", var.region,
        "--platform", "managed",
        "--quiet"
      ]
    }
  }

  substitutions = {
    _SERVICE_NAME = "get-file-path"
  }

  depends_on = [
    google_project_service.cloud_build_api,
    google_artifact_registry_repository.app_images
  ]
}

# ========================================
# Cloud Build Service Account IAM
# ========================================

# Allow Cloud Build to deploy to Cloud Run
resource "google_project_iam_member" "cloud_build_cloud_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${data.google_project.main.number}@cloudbuild.gserviceaccount.com"
}

# Allow Cloud Build to act as service accounts
resource "google_project_iam_member" "cloud_build_service_account_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${data.google_project.main.number}@cloudbuild.gserviceaccount.com"
}
resource "google_cloud_run_v2_service" "file_upload_app_staging" {
  client         = "gcloud"
  client_version = "536.0.1"
  ingress        = "INGRESS_TRAFFIC_ALL"

  labels = {
    commit-sha         = "27150f5caf7cd80e3ad7a1b64ec65dcd02489757"
    gcb-build-id       = "baa3d8f0-0f78-47d7-a052-00bb9da5300c"
    gcb-trigger-id     = "851f4464-de95-4054-98d4-a0198b41e3c6"
    gcb-trigger-region = "global"
    managed-by         = "gcp-cloud-build-deploy-cloud-run"
  }

  launch_stage = "GA"
  location     = "asia-northeast1"
  name         = "file-upload-app-staging"
  project      = "reflected-flux-462908-s6"

  template {
    containers {
      env {
        name  = "NEXT_PUBLIC_BUCKET_NAME"
        value = "app_contracts_staging"
      }

      env {
        name  = "GOOGLE_CLOUD_STORAGE_BUCKET"
        value = "app_contracts_staging"
      }

      image = "asia-northeast1-docker.pkg.dev/reflected-flux-462908-s6/cloud-run-source-deploy/file-upload-app/file-upload-app-staging:27150f5caf7cd80e3ad7a1b64ec65dcd02489757"
      name  = "placeholder-1"

      ports {
        container_port = 8080
        name           = "http1"
      }

      resources {
        cpu_idle = true

        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }

        startup_cpu_boost = true
      }

      startup_probe {
        failure_threshold     = 1
        initial_delay_seconds = 0
        period_seconds        = 240

        tcp_socket {
          port = 8080
        }

        timeout_seconds = 240
      }
    }

    labels = {
      commit-sha         = "27150f5caf7cd80e3ad7a1b64ec65dcd02489757"
      gcb-build-id       = "baa3d8f0-0f78-47d7-a052-00bb9da5300c"
      gcb-trigger-id     = "851f4464-de95-4054-98d4-a0198b41e3c6"
      gcb-trigger-region = "global"
      managed-by         = "gcp-cloud-build-deploy-cloud-run"
    }

    max_instance_request_concurrency = 80

    scaling {
      max_instance_count = 100
    }

    service_account = "75499681521-compute@developer.gserviceaccount.com"
    timeout         = "300s"
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}
# terraform import google_cloud_run_v2_service.file_upload_app_staging projects/reflected-flux-462908-s6/locations/asia-northeast1/services/file-upload-app-staging

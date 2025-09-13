resource "google_cloud_run_v2_service" "file_upload_app" {
  client         = "gcloud"
  client_version = "533.0.0"
  ingress        = "INGRESS_TRAFFIC_ALL"

  labels = {
    commit-sha         = "fc659d3c55d7ccf1c2eacb9d08e57f74982ad0eb"
    gcb-build-id       = "8e17ddcd-f2dc-47fe-9610-8521ef5fcbae"
    gcb-trigger-id     = "ff2f7544-3bca-4639-933e-1c351fa50b1c"
    gcb-trigger-region = "global"
    managed-by         = "gcp-cloud-build-deploy-cloud-run"
  }

  launch_stage = "GA"
  location     = "asia-northeast1"
  name         = "file-upload-app"
  project      = "reflected-flux-462908-s6"

  template {
    containers {
      image = "asia-northeast1-docker.pkg.dev/reflected-flux-462908-s6/cloud-run-source-deploy/file-upload-app/file-upload-app:fc659d3c55d7ccf1c2eacb9d08e57f74982ad0eb"
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
      commit-sha         = "fc659d3c55d7ccf1c2eacb9d08e57f74982ad0eb"
      gcb-build-id       = "8e17ddcd-f2dc-47fe-9610-8521ef5fcbae"
      gcb-trigger-id     = "ff2f7544-3bca-4639-933e-1c351fa50b1c"
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
# terraform import google_cloud_run_v2_service.file_upload_app projects/reflected-flux-462908-s6/locations/asia-northeast1/services/file-upload-app

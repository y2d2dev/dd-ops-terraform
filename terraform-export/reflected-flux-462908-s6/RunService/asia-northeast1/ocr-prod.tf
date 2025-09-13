resource "google_cloud_run_v2_service" "ocr_prod" {
  client         = "gcloud"
  client_version = "536.0.1"
  ingress        = "INGRESS_TRAFFIC_ALL"

  labels = {
    commit-sha         = "6e32117b2f38024ae99fc731bae137407c7c7508"
    gcb-build-id       = "29ae4388-7611-4b81-9191-760a6a630a2e"
    gcb-trigger-id     = "8a6d867d-882f-4b1f-92f9-518911b20ba2"
    gcb-trigger-region = "global"
    managed-by         = "gcp-cloud-build-deploy-cloud-run"
  }

  launch_stage = "GA"
  location     = "asia-northeast1"
  name         = "ocr-prod"
  project      = "reflected-flux-462908-s6"

  template {
    containers {
      env {
        name  = "GCS_BUCKET_NAME"
        value = "app_contracts"
      }

      env {
        name  = "CONFIG_PATH"
        value = "config/config.yaml"
      }

      env {
        name  = "TEMP_DIR"
        value = "/tmp/ocr_processing"
      }

      env {
        name  = "GEMINI_API_KEY"
        value = "AIzaSyBqCglI2T2D_WsZB05k5rHxVhpu6u_qNs8"
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://postgres:qjFJ8foxA2Qy722mqeweQ@10.1.0.3:5432/dd_ops"
      }

      image = "gcr.io/reflected-flux-462908-s6/ocr-integration-system:bfd477876557824c2d521f445edb9604c14fc8b2"
      name  = "placeholder-1"

      ports {
        container_port = 8080
        name           = "http1"
      }

      resources {
        cpu_idle = true

        limits = {
          cpu    = "2"
          memory = "8Gi"
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

      volume_mounts {
        mount_path = "/cloudsql"
        name       = "cloudsql"
      }
    }

    labels = {
      commit-sha         = "6e32117b2f38024ae99fc731bae137407c7c7508"
      gcb-build-id       = "29ae4388-7611-4b81-9191-760a6a630a2e"
      gcb-trigger-id     = "8a6d867d-882f-4b1f-92f9-518911b20ba2"
      gcb-trigger-region = "global"
      managed-by         = "gcp-cloud-build-deploy-cloud-run"
    }

    max_instance_request_concurrency = 1

    scaling {
      max_instance_count = 10
    }

    service_account = "75499681521-compute@developer.gserviceaccount.com"
    timeout         = "3600s"

    volumes {
      cloud_sql_instance {
        instances = ["reflected-flux-462908-s6:asia-northeast1:dd-ops-db"]
      }

      name = "cloudsql"
    }

    vpc_access {
      connector = "dd-ops-connector"
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}
# terraform import google_cloud_run_v2_service.ocr_prod projects/reflected-flux-462908-s6/locations/asia-northeast1/services/ocr-prod

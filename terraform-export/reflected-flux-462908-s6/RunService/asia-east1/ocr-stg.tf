resource "google_cloud_run_v2_service" "ocr_stg" {
  client         = "gcloud"
  client_version = "536.0.1"
  ingress        = "INGRESS_TRAFFIC_ALL"

  labels = {
    commit-sha         = "bfd477876557824c2d521f445edb9604c14fc8b2"
    gcb-build-id       = "0cf7bdd5-6a20-4515-aa54-247d32cc6173"
    gcb-trigger-id     = "331a8e71-917a-44ab-9c75-875f7e0808e5"
    gcb-trigger-region = "global"
    managed-by         = "gcp-cloud-build-deploy-cloud-run"
  }

  launch_stage = "GA"
  location     = "asia-east1"
  name         = "ocr-stg"
  project      = "reflected-flux-462908-s6"

  template {
    containers {
      env {
        name  = "GCS_BUCKET_NAME"
        value = "app_contracts_staging"
      }

      env {
        name  = "GEMINI_API_KEY"
        value = "AIzaSyBqCglI2T2D_WsZB05k5rHxVhpu6u_qNs8"
      }

      image = "asia-east1-docker.pkg.dev/reflected-flux-462908-s6/cloud-run-source-deploy/ocr_integration_system/ocr-stg:bfd477876557824c2d521f445edb9604c14fc8b2"
      name  = "placeholder-1"

      ports {
        container_port = 8080
        name           = "http1"
      }

      resources {
        cpu_idle = true

        limits = {
          cpu    = "2000m"
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
    }

    labels = {
      commit-sha         = "bfd477876557824c2d521f445edb9604c14fc8b2"
      gcb-build-id       = "0cf7bdd5-6a20-4515-aa54-247d32cc6173"
      gcb-trigger-id     = "331a8e71-917a-44ab-9c75-875f7e0808e5"
      gcb-trigger-region = "global"
      managed-by         = "gcp-cloud-build-deploy-cloud-run"
    }

    max_instance_request_concurrency = 10

    scaling {
      max_instance_count = 10
    }

    service_account = "75499681521-compute@developer.gserviceaccount.com"
    timeout         = "3600s"

    vpc_access {
      connector = "projects/reflected-flux-462908-s6/locations/asia-east1/connectors/dd-ops-staging-connector"
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}
# terraform import google_cloud_run_v2_service.ocr_stg projects/reflected-flux-462908-s6/locations/asia-east1/services/ocr-stg

resource "google_cloud_run_v2_service" "ocr_pro_test_staging" {
  client       = "cloud-console"
  ingress      = "INGRESS_TRAFFIC_ALL"
  launch_stage = "GA"
  location     = "asia-northeast1"
  name         = "ocr-pro-test-staging"
  project      = "reflected-flux-462908-s6"

  template {
    containers {
      image = "asia-northeast1-docker.pkg.dev/reflected-flux-462908-s6/cloud-run-source-deploy/ocr-pro-test-staging@sha256:100cf5dab8c8848b83b75a4c8ac0da95eccc102eeac547924176513a085e00f6"
      name  = "ocr-pro-test-staging-1"

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
# terraform import google_cloud_run_v2_service.ocr_pro_test_staging projects/reflected-flux-462908-s6/locations/asia-northeast1/services/ocr-pro-test-staging

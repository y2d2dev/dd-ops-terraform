resource "google_cloud_run_v2_service" "ocr_pro_test" {
  client       = "cloud-console"
  ingress      = "INGRESS_TRAFFIC_ALL"
  launch_stage = "GA"
  location     = "asia-northeast1"
  name         = "ocr-pro-test"
  project      = "reflected-flux-462908-s6"

  template {
    containers {
      image = "asia-northeast1-docker.pkg.dev/reflected-flux-462908-s6/cloud-run-source-deploy/ocr-pro-test@sha256:9540723e945e0509801d8acae9238653c1d830b2598641bffe2936cacb7b1007"
      name  = "ocr-pro-test-1"

      ports {
        container_port = 8080
        name           = "http1"
      }

      resources {
        cpu_idle = true

        limits = {
          cpu    = "1000m"
          memory = "2Gi"
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
# terraform import google_cloud_run_v2_service.ocr_pro_test projects/reflected-flux-462908-s6/locations/asia-northeast1/services/ocr-pro-test

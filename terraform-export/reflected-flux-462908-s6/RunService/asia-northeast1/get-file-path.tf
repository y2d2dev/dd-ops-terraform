resource "google_cloud_run_v2_service" "get_file_path" {
  client       = "cloud-console"
  ingress      = "INGRESS_TRAFFIC_ALL"
  launch_stage = "GA"
  location     = "asia-northeast1"
  name         = "get-file-path"
  project      = "reflected-flux-462908-s6"

  template {
    containers {
      image = "asia-northeast1-docker.pkg.dev/reflected-flux-462908-s6/cloud-run-source-deploy/get-file-path@sha256:1ff05eb850b54528671b9eae75642e2579afd9d2d016eac8a707ccc4efc1f2f9"
      name  = "get-file-path-1"

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

    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"

      network_interfaces {
        network    = "dd-ops-vpc"
        subnetwork = "dd-ops-subnet"
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}
# terraform import google_cloud_run_v2_service.get_file_path projects/reflected-flux-462908-s6/locations/asia-northeast1/services/get-file-path

resource "google_cloud_run_v2_service" "get_file_path_staging" {
  client       = "cloud-console"
  ingress      = "INGRESS_TRAFFIC_ALL"
  launch_stage = "GA"
  location     = "asia-east1"
  name         = "get-file-path-staging"
  project      = "reflected-flux-462908-s6"

  template {
    containers {
      image = "asia-east1-docker.pkg.dev/reflected-flux-462908-s6/cloud-run-source-deploy/get-file-path-staging@sha256:fba4d5a1eafdf9e7d6773f2ab51be81fc5e4aefa569b9e4c828d85c7df06f9e9"
      name  = "get-file-path-staging-1"

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

      volume_mounts {
        mount_path = "/cloudsql"
        name       = "cloudsql"
      }
    }

    max_instance_request_concurrency = 80

    scaling {
      max_instance_count = 10
    }

    service_account = "75499681521-compute@developer.gserviceaccount.com"
    timeout         = "300s"

    volumes {
      cloud_sql_instance {
        instances = ["reflected-flux-462908-s6:asia-east1:dd-ops-db-staging"]
      }

      name = "cloudsql"
    }

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
# terraform import google_cloud_run_v2_service.get_file_path_staging projects/reflected-flux-462908-s6/locations/asia-east1/services/get-file-path-staging

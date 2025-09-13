resource "google_cloud_run_v2_service" "mergy_system_stg" {
  client         = "gcloud"
  client_version = "537.0.0"
  ingress        = "INGRESS_TRAFFIC_ALL"
  launch_stage   = "GA"
  location       = "asia-east1"
  name           = "mergy-system-stg"
  project        = "reflected-flux-462908-s6"

  template {
    containers {
      env {
        name  = "NODE_ENV"
        value = "staging"
      }

      env {
        name = "DATABASE_URL"

        value_source {
          secret_key_ref {
            secret  = "MERGY_STG_DATABASE_URL"
            version = "latest"
          }
        }
      }

      image = "asia-east1-docker.pkg.dev/reflected-flux-462908-s6/cloud-run-source-deploy/mergy-system-stg:e7f13ae"

      ports {
        container_port = 8080
        name           = "http1"
      }

      resources {
        cpu_idle = true

        limits = {
          cpu    = "1"
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
      max_instance_count = 3
    }

    service_account = "mergy-system-stg@reflected-flux-462908-s6.iam.gserviceaccount.com"
    timeout         = "300s"

    vpc_access {
      connector = "dd-ops-staging-connector"
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}
# terraform import google_cloud_run_v2_service.mergy_system_stg projects/reflected-flux-462908-s6/locations/asia-east1/services/mergy-system-stg

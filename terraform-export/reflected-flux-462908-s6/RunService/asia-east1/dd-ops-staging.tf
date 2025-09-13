resource "google_cloud_run_v2_service" "dd_ops_staging" {
  client         = "gcloud"
  client_version = "536.0.1"
  ingress        = "INGRESS_TRAFFIC_ALL"

  labels = {
    commit-sha         = "a93432065ec540e8fc61c0895fa5d4495e333bd1"
    gcb-build-id       = "96b2c81c-f6d4-43fd-963d-c2fa4c82435e"
    gcb-trigger-id     = "5bba1b4b-dd6f-4764-a75e-9e8ec7f9d27f"
    gcb-trigger-region = "global"
    managed-by         = "gcp-cloud-build-deploy-cloud-run"
  }

  launch_stage = "GA"
  location     = "asia-east1"
  name         = "dd-ops-staging"
  project      = "reflected-flux-462908-s6"

  template {
    containers {
      env {
        name  = "NODE_ENV"
        value = "development"
      }

      env {
        name  = "NEXT_PUBLIC_ENV"
        value = "staging"
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://postgres:Avop9ghE5uTR3mm@10.1.1.3:5432/dd_ops"
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "https://get-file-path-staging-75499681521.asia-east1.run.app"
      }

      env {
        name  = "NEXT_PUBLIC_FILE_SERVER_URL"
        value = "https://cdn.dd-ops.net"
      }

      env {
        name  = "NEXT_PUBLIC_UPLOAD_APP_URL"
        value = "https://file-upload-app-staging-75499681521.asia-northeast1.run.app"
      }

      env {
        name  = "DOCUMENT_AI_PROCESSOR_URL"
        value = "https://us-documentai.googleapis.com/v1/projects/1051969327906/locations/us/processors/2c0e6c69f2e8fca4:process"
      }

      env {
        name  = "MISTRAL_API_KEY"
        value = "mZXIQJLUYvynQPwSMIFZjODJXpLlP3oB"
      }

      env {
        name  = "GOOGLE_GEMINI_API_KEY"
        value = "AIzaSyAg2tNsrsmbdJCVDDrQGf0Zvlc-2hrJYMk"
      }

      env {
        name  = "NEXTAUTH_SECRET"
        value = "CHANGE-THIS-TO-STRONG-SECRET-IN-PRODUCTION"
      }

      env {
        name  = "JWT_SECRET"
        value = "super-secret-jwt-key-for-production"
      }

      image = "gcr.io/reflected-flux-462908-s6/dd-ops-staging:8ea37bfd529c97975cedee9c17c682d66b39295d"
      name  = "placeholder-1"

      ports {
        container_port = 3000
        name           = "http1"
      }

      resources {
        cpu_idle = true

        limits = {
          cpu    = "2"
          memory = "2Gi"
        }

        startup_cpu_boost = true
      }

      startup_probe {
        failure_threshold     = 1
        initial_delay_seconds = 0
        period_seconds        = 240

        tcp_socket {
          port = 3000
        }

        timeout_seconds = 240
      }

      volume_mounts {
        mount_path = "/cloudsql"
        name       = "cloudsql"
      }
    }

    labels = {
      commit-sha         = "a93432065ec540e8fc61c0895fa5d4495e333bd1"
      gcb-build-id       = "96b2c81c-f6d4-43fd-963d-c2fa4c82435e"
      gcb-trigger-id     = "5bba1b4b-dd6f-4764-a75e-9e8ec7f9d27f"
      gcb-trigger-region = "global"
      managed-by         = "gcp-cloud-build-deploy-cloud-run"
    }

    max_instance_request_concurrency = 80

    scaling {
      max_instance_count = 10
    }

    service_account = "75499681521-compute@developer.gserviceaccount.com"
    timeout         = "1800s"

    volumes {
      cloud_sql_instance {
        instances = ["reflected-flux-462908-s6:asia-east1:dd-ops-db-staging"]
      }

      name = "cloudsql"
    }

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
# terraform import google_cloud_run_v2_service.dd_ops_staging projects/reflected-flux-462908-s6/locations/asia-east1/services/dd-ops-staging

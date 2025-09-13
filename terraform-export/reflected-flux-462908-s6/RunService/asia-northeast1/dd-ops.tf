resource "google_cloud_run_v2_service" "dd_ops" {
  client         = "gcloud"
  client_version = "536.0.1"
  ingress        = "INGRESS_TRAFFIC_ALL"

  labels = {
    commit-sha         = "cd31fbdcee410552c9169ac047701ca3eeeb2774"
    gcb-build-id       = "73c3d5d2-d3be-4e10-a0fc-35ebc29f4560"
    gcb-trigger-id     = "719a7882-cdd6-48e2-ad65-e01f036ace64"
    gcb-trigger-region = "global"
    managed-by         = "gcp-cloud-build-deploy-cloud-run"
  }

  launch_stage = "GA"
  location     = "asia-northeast1"
  name         = "dd-ops"
  project      = "reflected-flux-462908-s6"

  template {
    containers {
      args    = ["-c", "npx prisma migrate deploy && npm start"]
      command = ["sh"]

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "NEXT_PUBLIC_ENV"
        value = "production"
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://postgres:qjFJ8foxA2Qy722mqeweQ@10.1.0.3:5432/dd_ops"
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "https://get-file-path-75499681521.asia-northeast1.run.app"
      }

      env {
        name  = "NEXT_PUBLIC_FILE_SERVER_URL"
        value = "https://cdn.dd-ops.net"
      }

      env {
        name  = "NEXT_PUBLIC_UPLOAD_APP_URL"
        value = "https://file-upload-app-75499681521.asia-northeast1.run.app"
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

      image = "gcr.io/reflected-flux-462908-s6/dd-ops:ced753d5e62c5dcbcbc05260f62a4141181df815"
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
        failure_threshold     = 3
        initial_delay_seconds = 60
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

    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"

    labels = {
      commit-sha         = "cd31fbdcee410552c9169ac047701ca3eeeb2774"
      gcb-build-id       = "73c3d5d2-d3be-4e10-a0fc-35ebc29f4560"
      gcb-trigger-id     = "719a7882-cdd6-48e2-ad65-e01f036ace64"
      gcb-trigger-region = "global"
      managed-by         = "gcp-cloud-build-deploy-cloud-run"
    }

    max_instance_request_concurrency = 1000

    scaling {
      max_instance_count = 10
    }

    service_account = "dd-ops-prod@reflected-flux-462908-s6.iam.gserviceaccount.com"
    timeout         = "900s"

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
# terraform import google_cloud_run_v2_service.dd_ops projects/reflected-flux-462908-s6/locations/asia-northeast1/services/dd-ops

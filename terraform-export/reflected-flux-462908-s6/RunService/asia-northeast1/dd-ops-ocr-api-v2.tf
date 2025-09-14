resource "google_cloud_run_v2_service" "dd_ops_ocr_api_v2" {
  client         = "gcloud"
  client_version = "530.0.0"
  ingress        = "INGRESS_TRAFFIC_ALL"
  launch_stage   = "GA"
  location       = "asia-northeast1"
  name           = "dd-ops-ocr-api-v2"
  project        = "reflected-flux-462908-s6"

  template {
    containers {
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = "reflected-flux-462908-s6"
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = "app_contracts"
      }

      env {
        name  = "DD_OPS_MODELS_BUCKET"
        value = "dd_ops_models"
      }

      env {
        name  = "PYTHONDONTWRITEBYTECODE"
        value = "1"
      }

      env {
        name  = "PYTHONUNBUFFERED"
        value = "1"
      }

      env {
        name  = "GEMINI_API_KEY"
        value = "AIzaSyCCZL0v2FOVqYbWhshAeyETCj0zE3_5m1s"
      }

      env {
        name  = "DOCUMENT_AI_PROJECT_ID"
        value = "75499681521"
      }

      env {
        name  = "DOCUMENT_AI_PROCESSOR_ID"
        value = "599b6ebb19fa1478"
      }

      env {
        name  = "DOCUMENT_AI_LOCATION"
        value = "us"
      }

      image = "gcr.io/reflected-flux-462908-s6/dd-ops-ocr-api"

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
      max_instance_count = 20
    }

    service_account = "75499681521-compute@developer.gserviceaccount.com"
    timeout         = "3600s"
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}
# terraform import google_cloud_run_v2_service.dd_ops_ocr_api_v2 projects/reflected-flux-462908-s6/locations/asia-northeast1/services/dd-ops-ocr-api-v2

resource "google_cloud_run_v2_job" "migration_job" {
  client         = "gcloud"
  client_version = "525.0.0"
  launch_stage   = "GA"
  location       = "asia-northeast1"
  name           = "migration-job"
  project        = "reflected-flux-462908-s6"

  template {
    task_count = 1

    template {
      containers {
        args    = ["prisma", "migrate", "deploy"]
        command = ["npx"]

        env {
          name  = "DATABASE_URL"
          value = "postgresql://postgres:postgres@10.1.0.3:5432/dd_ops"
        }

        image = "gcr.io/reflected-flux-462908-s6/dd-ops:latest"

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
      }

      execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
      max_retries           = 3
      service_account       = "75499681521-compute@developer.gserviceaccount.com"
      timeout               = "600s"

      vpc_access {
        connector = "dd-ops-connector"
        egress    = "PRIVATE_RANGES_ONLY"
      }
    }
  }
}
# terraform import google_cloud_run_v2_job.migration_job projects/reflected-flux-462908-s6/locations/asia-northeast1/jobs/migration-job

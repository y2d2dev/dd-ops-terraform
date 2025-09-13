resource "google_storage_bucket" "app_contracts_staging" {
  cors {
    max_age_seconds = 3600
    method          = ["GET", "HEAD"]
    origin          = ["http://localhost:3001", "https://dd-ops-staging-75499681521.asia-east1.run.app"]
    response_header = ["Content-Type"]
  }

  force_destroy               = false
  location                    = "ASIA-NORTHEAST1"
  name                        = "app_contracts_staging"
  project                     = "reflected-flux-462908-s6"
  public_access_prevention    = "enforced"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
}
# terraform import google_storage_bucket.app_contracts_staging app_contracts_staging

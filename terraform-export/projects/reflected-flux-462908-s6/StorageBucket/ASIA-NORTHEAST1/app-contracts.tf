resource "google_storage_bucket" "app_contracts" {
  cors {
    max_age_seconds = 3600
    method          = ["GET", "HEAD", "OPTIONS"]
    origin          = ["https://dd-ops.net"]
    response_header = ["Content-Type", "Content-Length", "Content-Disposition", "x-goog-meta-*"]
  }

  force_destroy               = false
  location                    = "ASIA-NORTHEAST1"
  name                        = "app_contracts"
  project                     = "reflected-flux-462908-s6"
  public_access_prevention    = "enforced"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
}
# terraform import google_storage_bucket.app_contracts app_contracts

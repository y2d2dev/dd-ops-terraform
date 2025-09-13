resource "google_compute_backend_bucket" "app_constract_staging_backend_bucket" {
  bucket_name = "app_constracts_staging"

  cdn_policy {
    cache_mode         = "CACHE_ALL_STATIC"
    client_ttl         = 3600
    default_ttl        = 3600
    max_ttl            = 86400
    request_coalescing = true
  }

  compression_mode = "DISABLED"
  enable_cdn       = true
  name             = "app-constract-staging-backend-bucket"
  project          = "reflected-flux-462908-s6"
}
# terraform import google_compute_backend_bucket.app_constract_staging_backend_bucket projects/reflected-flux-462908-s6/global/backendBuckets/app-constract-staging-backend-bucket

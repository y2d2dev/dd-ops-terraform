resource "google_compute_backend_bucket" "app_contracts_staging_backend_bucket" {
  bucket_name = "app_contracts_staging"

  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    client_ttl                   = 3600
    default_ttl                  = 3600
    max_ttl                      = 86400
    negative_caching             = true
    request_coalescing           = true
    serve_while_stale            = 86400
    signed_url_cache_max_age_sec = 3600
  }

  compression_mode = "DISABLED"
  enable_cdn       = true
  name             = "app-contracts-staging-backend-bucket"
  project          = "reflected-flux-462908-s6"
}
# terraform import google_compute_backend_bucket.app_contracts_staging_backend_bucket projects/reflected-flux-462908-s6/global/backendBuckets/app-contracts-staging-backend-bucket

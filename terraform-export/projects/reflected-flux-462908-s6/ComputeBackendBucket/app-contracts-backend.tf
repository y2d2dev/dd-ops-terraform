resource "google_compute_backend_bucket" "app_contracts_backend" {
  bucket_name = "app_contracts"

  cdn_policy {
    cache_mode         = "CACHE_ALL_STATIC"
    client_ttl         = 3600
    default_ttl        = 3600
    max_ttl            = 86400
    request_coalescing = true
  }

  compression_mode = "DISABLED"
  enable_cdn       = true
  name             = "app-contracts-backend"
  project          = "reflected-flux-462908-s6"
}
# terraform import google_compute_backend_bucket.app_contracts_backend projects/reflected-flux-462908-s6/global/backendBuckets/app-contracts-backend

resource "google_compute_backend_service" "gcs_backend_service" {
  cdn_policy {
    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = true
    }

    cache_mode                   = "CACHE_ALL_STATIC"
    client_ttl                   = 3600
    default_ttl                  = 3600
    max_ttl                      = 86400
    signed_url_cache_max_age_sec = 0
  }

  compression_mode                = "DISABLED"
  connection_draining_timeout_sec = 0
  custom_request_headers          = ["Host:storage.googleapis.com"]
  enable_cdn                      = true
  load_balancing_scheme           = "EXTERNAL_MANAGED"
  locality_lb_policy              = "ROUND_ROBIN"

  log_config {
    sample_rate = 0
  }

  name             = "gcs-backend-service"
  port_name        = "http"
  project          = "reflected-flux-462908-s6"
  protocol         = "HTTPS"
  security_policy  = "https://www.googleapis.com/compute/beta/projects/reflected-flux-462908-s6/global/securityPolicies/workspace-ip-policy"
  session_affinity = "NONE"
  timeout_sec      = 30
}
# terraform import google_compute_backend_service.gcs_backend_service projects/reflected-flux-462908-s6/global/backendServices/gcs-backend-service

resource "google_compute_backend_service" "pgladmin_backend" {
  connection_draining_timeout_sec = 0
  custom_request_headers          = ["Host:pgladmin-dd-ops-75499681521.asia-northeast1.run.app"]
  load_balancing_scheme           = "EXTERNAL"
  name                            = "pgladmin-backend"
  port_name                       = "http"
  project                         = "reflected-flux-462908-s6"
  protocol                        = "HTTPS"
  security_policy                 = "https://www.googleapis.com/compute/beta/projects/reflected-flux-462908-s6/global/securityPolicies/pgladmin-ip-policy"
  session_affinity                = "NONE"
  timeout_sec                     = 30
}
# terraform import google_compute_backend_service.pgladmin_backend projects/reflected-flux-462908-s6/global/backendServices/pgladmin-backend

resource "google_compute_global_forwarding_rule" "workspace_frontend_https" {
  ip_address            = "34.117.89.139"
  ip_protocol           = "TCP"
  ip_version            = "IPV4"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  name                  = "workspace-frontend-https"
  port_range            = "443-443"
  project               = "reflected-flux-462908-s6"
  target                = "https://www.googleapis.com/compute/beta/projects/reflected-flux-462908-s6/global/targetHttpsProxies/workspace-lb-target-proxy-2"
}
# terraform import google_compute_global_forwarding_rule.workspace_frontend_https projects/reflected-flux-462908-s6/global/forwardingRules/workspace-frontend-https

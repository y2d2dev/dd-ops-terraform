resource "google_compute_global_forwarding_rule" "workspace_frontend" {
  ip_address            = "34.160.109.158"
  ip_protocol           = "TCP"
  ip_version            = "IPV4"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  name                  = "workspace-frontend"
  port_range            = "80-80"
  project               = "reflected-flux-462908-s6"
  target                = "https://www.googleapis.com/compute/beta/projects/reflected-flux-462908-s6/global/targetHttpProxies/workspace-lb-target-proxy"
}
# terraform import google_compute_global_forwarding_rule.workspace_frontend projects/reflected-flux-462908-s6/global/forwardingRules/workspace-frontend

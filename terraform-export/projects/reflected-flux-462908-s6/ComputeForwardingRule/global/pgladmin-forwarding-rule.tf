resource "google_compute_global_forwarding_rule" "pgladmin_forwarding_rule" {
  ip_address            = "34.120.119.136"
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL"
  name                  = "pgladmin-forwarding-rule"
  port_range            = "443-443"
  project               = "reflected-flux-462908-s6"
  target                = "https://www.googleapis.com/compute/beta/projects/reflected-flux-462908-s6/global/targetHttpsProxies/pgladmin-https-proxy"
}
# terraform import google_compute_global_forwarding_rule.pgladmin_forwarding_rule projects/reflected-flux-462908-s6/global/forwardingRules/pgladmin-forwarding-rule

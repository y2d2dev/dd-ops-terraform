resource "google_compute_target_https_proxy" "workspace_lb_target_proxy_2" {
  name             = "workspace-lb-target-proxy-2"
  project          = "reflected-flux-462908-s6"
  quic_override    = "NONE"
  ssl_certificates = ["https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/sslCertificates/cdn-ssl"]
  url_map          = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/urlMaps/workspace-lb"
}
# terraform import google_compute_target_https_proxy.workspace_lb_target_proxy_2 projects/reflected-flux-462908-s6/global/targetHttpsProxies/workspace-lb-target-proxy-2

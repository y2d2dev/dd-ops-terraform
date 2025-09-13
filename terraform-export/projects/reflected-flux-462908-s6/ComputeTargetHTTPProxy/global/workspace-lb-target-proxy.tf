resource "google_compute_target_http_proxy" "workspace_lb_target_proxy" {
  name    = "workspace-lb-target-proxy"
  project = "reflected-flux-462908-s6"
  url_map = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/urlMaps/workspace-lb"
}
# terraform import google_compute_target_http_proxy.workspace_lb_target_proxy projects/reflected-flux-462908-s6/global/targetHttpProxies/workspace-lb-target-proxy

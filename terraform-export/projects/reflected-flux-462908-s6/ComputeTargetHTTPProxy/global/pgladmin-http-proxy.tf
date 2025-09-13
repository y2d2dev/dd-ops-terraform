resource "google_compute_target_http_proxy" "pgladmin_http_proxy" {
  name    = "pgladmin-http-proxy"
  project = "reflected-flux-462908-s6"
  url_map = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/urlMaps/pgladmin-urlmap"
}
# terraform import google_compute_target_http_proxy.pgladmin_http_proxy projects/reflected-flux-462908-s6/global/targetHttpProxies/pgladmin-http-proxy

resource "google_compute_target_https_proxy" "pgladmin_https_proxy" {
  name             = "pgladmin-https-proxy"
  project          = "reflected-flux-462908-s6"
  quic_override    = "NONE"
  ssl_certificates = ["https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/sslCertificates/pgladmin-ssl-cert"]
  url_map          = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/urlMaps/pgladmin-urlmap"
}
# terraform import google_compute_target_https_proxy.pgladmin_https_proxy projects/reflected-flux-462908-s6/global/targetHttpsProxies/pgladmin-https-proxy

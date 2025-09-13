resource "google_compute_ssl_certificate" "pgladmin_ssl_cert" {
  name    = "pgladmin-ssl-cert"
  project = "reflected-flux-462908-s6"
}
# terraform import google_compute_ssl_certificate.pgladmin_ssl_cert projects/reflected-flux-462908-s6/global/sslCertificates/pgladmin-ssl-cert

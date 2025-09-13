resource "google_compute_global_address" "pgladmin_ip" {
  address      = "34.120.119.136"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"
  name         = "pgladmin-ip"
  project      = "reflected-flux-462908-s6"
}
# terraform import google_compute_global_address.pgladmin_ip projects/reflected-flux-462908-s6/global/addresses/pgladmin-ip

resource "google_compute_global_address" "app_contracts_ip" {
  address      = "34.36.159.13"
  address_type = "EXTERNAL"
  description  = "DDで使う"
  ip_version   = "IPV4"
  name         = "app-contracts-ip"
  project      = "reflected-flux-462908-s6"
}
# terraform import google_compute_global_address.app_contracts_ip projects/reflected-flux-462908-s6/global/addresses/app-contracts-ip

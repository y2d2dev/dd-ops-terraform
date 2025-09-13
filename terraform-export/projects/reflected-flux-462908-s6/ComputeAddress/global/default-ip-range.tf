resource "google_compute_global_address" "default_ip_range" {
  address       = "10.18.112.0"
  address_type  = "INTERNAL"
  name          = "default-ip-range"
  network       = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/networks/default"
  prefix_length = 20
  project       = "reflected-flux-462908-s6"
  purpose       = "VPC_PEERING"
}
# terraform import google_compute_global_address.default_ip_range projects/reflected-flux-462908-s6/global/addresses/default-ip-range

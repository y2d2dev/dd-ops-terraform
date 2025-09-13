resource "google_compute_global_address" "google_managed_services_dd_ops" {
  address       = "10.1.0.0"
  address_type  = "INTERNAL"
  name          = "google-managed-services-dd-ops"
  network       = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/networks/dd-ops-vpc"
  prefix_length = 16
  project       = "reflected-flux-462908-s6"
  purpose       = "VPC_PEERING"
}
# terraform import google_compute_global_address.google_managed_services_dd_ops projects/reflected-flux-462908-s6/global/addresses/google-managed-services-dd-ops

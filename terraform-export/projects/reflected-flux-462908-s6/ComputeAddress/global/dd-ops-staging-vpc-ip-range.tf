resource "google_compute_global_address" "dd_ops_staging_vpc_ip_range" {
  address       = "10.23.112.0"
  address_type  = "INTERNAL"
  name          = "dd-ops-staging-vpc-ip-range"
  network       = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/networks/dd-ops-staging-vpc"
  prefix_length = 20
  project       = "reflected-flux-462908-s6"
  purpose       = "VPC_PEERING"
}
# terraform import google_compute_global_address.dd_ops_staging_vpc_ip_range projects/reflected-flux-462908-s6/global/addresses/dd-ops-staging-vpc-ip-range

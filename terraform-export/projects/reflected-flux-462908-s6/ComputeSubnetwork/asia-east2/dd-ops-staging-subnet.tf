resource "google_compute_subnetwork" "dd_ops_staging_subnet" {
  ip_cidr_range              = "10.0.0.0/24"
  name                       = "dd-ops-staging-subnet"
  network                    = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/networks/dd-ops-staging-vpc"
  private_ipv6_google_access = "DISABLE_GOOGLE_ACCESS"
  project                    = "reflected-flux-462908-s6"
  purpose                    = "PRIVATE"
  region                     = "asia-east2"
  stack_type                 = "IPV4_ONLY"
}
# terraform import google_compute_subnetwork.dd_ops_staging_subnet projects/reflected-flux-462908-s6/regions/asia-east2/subnetworks/dd-ops-staging-subnet

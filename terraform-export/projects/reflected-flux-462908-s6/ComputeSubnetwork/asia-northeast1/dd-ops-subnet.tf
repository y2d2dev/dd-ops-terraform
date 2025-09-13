resource "google_compute_subnetwork" "dd_ops_subnet" {
  ip_cidr_range = "10.0.0.0/24"

  log_config {
    aggregation_interval = "INTERVAL_15_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }

  name                       = "dd-ops-subnet"
  network                    = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/networks/dd-ops-vpc"
  private_ipv6_google_access = "DISABLE_GOOGLE_ACCESS"
  project                    = "reflected-flux-462908-s6"
  purpose                    = "PRIVATE"
  region                     = "asia-northeast1"
  stack_type                 = "IPV4_ONLY"
}
# terraform import google_compute_subnetwork.dd_ops_subnet projects/reflected-flux-462908-s6/regions/asia-northeast1/subnetworks/dd-ops-subnet

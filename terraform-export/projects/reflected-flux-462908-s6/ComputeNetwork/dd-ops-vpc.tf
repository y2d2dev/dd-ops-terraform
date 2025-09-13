resource "google_compute_network" "dd_ops_vpc" {
  auto_create_subnetworks                   = false
  mtu                                       = 1460
  name                                      = "dd-ops-vpc"
  network_firewall_policy_enforcement_order = "AFTER_CLASSIC_FIREWALL"
  project                                   = "reflected-flux-462908-s6"
  routing_mode                              = "REGIONAL"
}
# terraform import google_compute_network.dd_ops_vpc projects/reflected-flux-462908-s6/global/networks/dd-ops-vpc

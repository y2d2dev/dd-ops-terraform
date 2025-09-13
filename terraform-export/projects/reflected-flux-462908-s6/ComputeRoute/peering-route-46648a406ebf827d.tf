resource "google_compute_route" "peering_route_46648a406ebf827d" {
  description = "Auto generated route via peering [servicenetworking-googleapis-com]."
  dest_range  = "10.23.112.0/24"
  name        = "peering-route-46648a406ebf827d"
  network     = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/networks/dd-ops-staging-vpc"
  priority    = 0
  project     = "reflected-flux-462908-s6"
}
# terraform import google_compute_route.peering_route_46648a406ebf827d projects/reflected-flux-462908-s6/global/routes/peering-route-46648a406ebf827d

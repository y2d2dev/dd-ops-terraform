resource "google_compute_route" "peering_route_8a943641897e8ecf" {
  description = "Auto generated route via peering [servicenetworking-googleapis-com]."
  dest_range  = "10.1.1.0/24"
  name        = "peering-route-8a943641897e8ecf"
  network     = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/networks/dd-ops-vpc"
  priority    = 0
  project     = "reflected-flux-462908-s6"
}
# terraform import google_compute_route.peering_route_8a943641897e8ecf projects/reflected-flux-462908-s6/global/routes/peering-route-8a943641897e8ecf

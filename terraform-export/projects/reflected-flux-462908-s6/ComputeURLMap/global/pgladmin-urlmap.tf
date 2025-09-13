resource "google_compute_url_map" "pgladmin_urlmap" {
  default_service = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/backendServices/pgladmin-backend"
  name            = "pgladmin-urlmap"
  project         = "reflected-flux-462908-s6"
}
# terraform import google_compute_url_map.pgladmin_urlmap projects/reflected-flux-462908-s6/global/urlMaps/pgladmin-urlmap

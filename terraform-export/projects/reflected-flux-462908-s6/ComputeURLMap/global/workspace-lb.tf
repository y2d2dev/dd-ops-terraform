resource "google_compute_url_map" "workspace_lb" {
  default_service = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/backendServices/gcs-backend-service"

  host_rule {
    hosts        = ["*"]
    path_matcher = "path-matcher-1"
  }

  name = "workspace-lb"

  path_matcher {
    default_service = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/backendServices/gcs-backend-service"
    name            = "path-matcher-1"

    path_rule {
      paths   = ["/*"]
      service = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/backendServices/gcs-backend-service"
    }

    path_rule {
      paths   = ["/api/*"]
      service = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/backendServices/gcs-backend-service"
    }

    path_rule {
      paths   = ["/pdf/*"]
      service = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/backendBuckets/app-contracts-backend"
    }

  }

  project = "reflected-flux-462908-s6"
}
# terraform import google_compute_url_map.workspace_lb projects/reflected-flux-462908-s6/global/urlMaps/workspace-lb

resource "google_artifact_registry_repository" "gcr_io" {
  format        = "DOCKER"
  location      = "us"
  mode          = "STANDARD_REPOSITORY"
  project       = "reflected-flux-462908-s6"
  repository_id = "gcr.io"
}
# terraform import google_artifact_registry_repository.gcr_io projects/reflected-flux-462908-s6/locations/us/repositories/gcr.io

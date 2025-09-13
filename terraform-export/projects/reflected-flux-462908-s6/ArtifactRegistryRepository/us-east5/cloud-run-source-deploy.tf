resource "google_artifact_registry_repository" "cloud_run_source_deploy" {
  description   = "Cloud Run Source Deployments"
  format        = "DOCKER"
  location      = "us-east5"
  mode          = "STANDARD_REPOSITORY"
  project       = "reflected-flux-462908-s6"
  repository_id = "cloud-run-source-deploy"
}
# terraform import google_artifact_registry_repository.cloud_run_source_deploy projects/reflected-flux-462908-s6/locations/us-east5/repositories/cloud-run-source-deploy

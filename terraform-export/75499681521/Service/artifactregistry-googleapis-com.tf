resource "google_project_service" "artifactregistry_googleapis_com" {
  project = "75499681521"
  service = "artifactregistry.googleapis.com"
}
# terraform import google_project_service.artifactregistry_googleapis_com 75499681521/artifactregistry.googleapis.com

resource "google_project_service" "cloudbuild_googleapis_com" {
  project = "75499681521"
  service = "cloudbuild.googleapis.com"
}
# terraform import google_project_service.cloudbuild_googleapis_com 75499681521/cloudbuild.googleapis.com

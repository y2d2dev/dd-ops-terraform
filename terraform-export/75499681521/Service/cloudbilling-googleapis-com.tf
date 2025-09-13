resource "google_project_service" "cloudbilling_googleapis_com" {
  project = "75499681521"
  service = "cloudbilling.googleapis.com"
}
# terraform import google_project_service.cloudbilling_googleapis_com 75499681521/cloudbilling.googleapis.com

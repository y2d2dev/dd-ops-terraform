resource "google_project_service" "logging_googleapis_com" {
  project = "75499681521"
  service = "logging.googleapis.com"
}
# terraform import google_project_service.logging_googleapis_com 75499681521/logging.googleapis.com

resource "google_project_service" "secretmanager_googleapis_com" {
  project = "75499681521"
  service = "secretmanager.googleapis.com"
}
# terraform import google_project_service.secretmanager_googleapis_com 75499681521/secretmanager.googleapis.com

resource "google_project_service" "certificatemanager_googleapis_com" {
  project = "75499681521"
  service = "certificatemanager.googleapis.com"
}
# terraform import google_project_service.certificatemanager_googleapis_com 75499681521/certificatemanager.googleapis.com

resource "google_project_service" "servicemanagement_googleapis_com" {
  project = "75499681521"
  service = "servicemanagement.googleapis.com"
}
# terraform import google_project_service.servicemanagement_googleapis_com 75499681521/servicemanagement.googleapis.com

resource "google_project_service" "serviceusage_googleapis_com" {
  project = "75499681521"
  service = "serviceusage.googleapis.com"
}
# terraform import google_project_service.serviceusage_googleapis_com 75499681521/serviceusage.googleapis.com

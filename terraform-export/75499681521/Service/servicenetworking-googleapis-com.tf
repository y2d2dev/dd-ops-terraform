resource "google_project_service" "servicenetworking_googleapis_com" {
  project = "75499681521"
  service = "servicenetworking.googleapis.com"
}
# terraform import google_project_service.servicenetworking_googleapis_com 75499681521/servicenetworking.googleapis.com

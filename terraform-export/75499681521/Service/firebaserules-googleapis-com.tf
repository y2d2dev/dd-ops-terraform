resource "google_project_service" "firebaserules_googleapis_com" {
  project = "75499681521"
  service = "firebaserules.googleapis.com"
}
# terraform import google_project_service.firebaserules_googleapis_com 75499681521/firebaserules.googleapis.com

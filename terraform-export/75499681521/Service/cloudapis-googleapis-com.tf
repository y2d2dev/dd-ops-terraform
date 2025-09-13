resource "google_project_service" "cloudapis_googleapis_com" {
  project = "75499681521"
  service = "cloudapis.googleapis.com"
}
# terraform import google_project_service.cloudapis_googleapis_com 75499681521/cloudapis.googleapis.com

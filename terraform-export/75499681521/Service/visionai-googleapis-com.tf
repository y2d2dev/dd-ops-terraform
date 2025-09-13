resource "google_project_service" "visionai_googleapis_com" {
  project = "75499681521"
  service = "visionai.googleapis.com"
}
# terraform import google_project_service.visionai_googleapis_com 75499681521/visionai.googleapis.com

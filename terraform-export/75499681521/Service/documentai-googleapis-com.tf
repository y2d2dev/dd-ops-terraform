resource "google_project_service" "documentai_googleapis_com" {
  project = "75499681521"
  service = "documentai.googleapis.com"
}
# terraform import google_project_service.documentai_googleapis_com 75499681521/documentai.googleapis.com

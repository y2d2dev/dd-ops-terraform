resource "google_project_service" "eventarc_googleapis_com" {
  project = "75499681521"
  service = "eventarc.googleapis.com"
}
# terraform import google_project_service.eventarc_googleapis_com 75499681521/eventarc.googleapis.com

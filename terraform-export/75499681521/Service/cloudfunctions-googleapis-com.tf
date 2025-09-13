resource "google_project_service" "cloudfunctions_googleapis_com" {
  project = "75499681521"
  service = "cloudfunctions.googleapis.com"
}
# terraform import google_project_service.cloudfunctions_googleapis_com 75499681521/cloudfunctions.googleapis.com

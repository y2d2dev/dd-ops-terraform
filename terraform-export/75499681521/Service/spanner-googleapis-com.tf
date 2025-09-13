resource "google_project_service" "spanner_googleapis_com" {
  project = "75499681521"
  service = "spanner.googleapis.com"
}
# terraform import google_project_service.spanner_googleapis_com 75499681521/spanner.googleapis.com

resource "google_project_service" "run_googleapis_com" {
  project = "75499681521"
  service = "run.googleapis.com"
}
# terraform import google_project_service.run_googleapis_com 75499681521/run.googleapis.com

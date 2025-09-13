resource "google_project_service" "notebooks_googleapis_com" {
  project = "75499681521"
  service = "notebooks.googleapis.com"
}
# terraform import google_project_service.notebooks_googleapis_com 75499681521/notebooks.googleapis.com

resource "google_project_service" "compute_googleapis_com" {
  project = "75499681521"
  service = "compute.googleapis.com"
}
# terraform import google_project_service.compute_googleapis_com 75499681521/compute.googleapis.com

resource "google_project_service" "monitoring_googleapis_com" {
  project = "75499681521"
  service = "monitoring.googleapis.com"
}
# terraform import google_project_service.monitoring_googleapis_com 75499681521/monitoring.googleapis.com

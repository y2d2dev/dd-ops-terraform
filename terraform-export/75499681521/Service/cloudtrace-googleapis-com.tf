resource "google_project_service" "cloudtrace_googleapis_com" {
  project = "75499681521"
  service = "cloudtrace.googleapis.com"
}
# terraform import google_project_service.cloudtrace_googleapis_com 75499681521/cloudtrace.googleapis.com

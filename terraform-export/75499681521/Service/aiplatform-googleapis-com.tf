resource "google_project_service" "aiplatform_googleapis_com" {
  project = "75499681521"
  service = "aiplatform.googleapis.com"
}
# terraform import google_project_service.aiplatform_googleapis_com 75499681521/aiplatform.googleapis.com

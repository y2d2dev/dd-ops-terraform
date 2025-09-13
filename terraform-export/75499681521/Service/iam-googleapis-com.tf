resource "google_project_service" "iam_googleapis_com" {
  project = "75499681521"
  service = "iam.googleapis.com"
}
# terraform import google_project_service.iam_googleapis_com 75499681521/iam.googleapis.com

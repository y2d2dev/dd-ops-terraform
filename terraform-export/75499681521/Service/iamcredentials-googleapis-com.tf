resource "google_project_service" "iamcredentials_googleapis_com" {
  project = "75499681521"
  service = "iamcredentials.googleapis.com"
}
# terraform import google_project_service.iamcredentials_googleapis_com 75499681521/iamcredentials.googleapis.com

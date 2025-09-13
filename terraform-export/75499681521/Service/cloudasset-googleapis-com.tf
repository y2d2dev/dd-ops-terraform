resource "google_project_service" "cloudasset_googleapis_com" {
  project = "75499681521"
  service = "cloudasset.googleapis.com"
}
# terraform import google_project_service.cloudasset_googleapis_com 75499681521/cloudasset.googleapis.com

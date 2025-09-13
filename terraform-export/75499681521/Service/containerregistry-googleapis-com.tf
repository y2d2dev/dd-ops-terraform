resource "google_project_service" "containerregistry_googleapis_com" {
  project = "75499681521"
  service = "containerregistry.googleapis.com"
}
# terraform import google_project_service.containerregistry_googleapis_com 75499681521/containerregistry.googleapis.com

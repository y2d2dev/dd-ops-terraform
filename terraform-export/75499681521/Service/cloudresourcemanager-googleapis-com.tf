resource "google_project_service" "cloudresourcemanager_googleapis_com" {
  project = "75499681521"
  service = "cloudresourcemanager.googleapis.com"
}
# terraform import google_project_service.cloudresourcemanager_googleapis_com 75499681521/cloudresourcemanager.googleapis.com

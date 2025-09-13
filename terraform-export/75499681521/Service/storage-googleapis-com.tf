resource "google_project_service" "storage_googleapis_com" {
  project = "75499681521"
  service = "storage.googleapis.com"
}
# terraform import google_project_service.storage_googleapis_com 75499681521/storage.googleapis.com

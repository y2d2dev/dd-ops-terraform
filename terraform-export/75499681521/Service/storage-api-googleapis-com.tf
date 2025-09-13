resource "google_project_service" "storage_api_googleapis_com" {
  project = "75499681521"
  service = "storage-api.googleapis.com"
}
# terraform import google_project_service.storage_api_googleapis_com 75499681521/storage-api.googleapis.com

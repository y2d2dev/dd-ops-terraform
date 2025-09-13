resource "google_project_service" "datastore_googleapis_com" {
  project = "75499681521"
  service = "datastore.googleapis.com"
}
# terraform import google_project_service.datastore_googleapis_com 75499681521/datastore.googleapis.com

resource "google_project_service" "bigquerystorage_googleapis_com" {
  project = "75499681521"
  service = "bigquerystorage.googleapis.com"
}
# terraform import google_project_service.bigquerystorage_googleapis_com 75499681521/bigquerystorage.googleapis.com

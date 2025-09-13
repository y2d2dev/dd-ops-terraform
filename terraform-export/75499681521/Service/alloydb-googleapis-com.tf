resource "google_project_service" "alloydb_googleapis_com" {
  project = "75499681521"
  service = "alloydb.googleapis.com"
}
# terraform import google_project_service.alloydb_googleapis_com 75499681521/alloydb.googleapis.com

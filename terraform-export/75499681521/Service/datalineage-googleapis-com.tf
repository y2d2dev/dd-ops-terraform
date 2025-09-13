resource "google_project_service" "datalineage_googleapis_com" {
  project = "75499681521"
  service = "datalineage.googleapis.com"
}
# terraform import google_project_service.datalineage_googleapis_com 75499681521/datalineage.googleapis.com

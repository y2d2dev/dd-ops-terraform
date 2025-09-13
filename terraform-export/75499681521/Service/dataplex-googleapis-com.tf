resource "google_project_service" "dataplex_googleapis_com" {
  project = "75499681521"
  service = "dataplex.googleapis.com"
}
# terraform import google_project_service.dataplex_googleapis_com 75499681521/dataplex.googleapis.com

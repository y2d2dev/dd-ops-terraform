resource "google_project_service" "bigquery_googleapis_com" {
  project = "75499681521"
  service = "bigquery.googleapis.com"
}
# terraform import google_project_service.bigquery_googleapis_com 75499681521/bigquery.googleapis.com

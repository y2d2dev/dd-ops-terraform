resource "google_project_service" "dataflow_googleapis_com" {
  project = "75499681521"
  service = "dataflow.googleapis.com"
}
# terraform import google_project_service.dataflow_googleapis_com 75499681521/dataflow.googleapis.com

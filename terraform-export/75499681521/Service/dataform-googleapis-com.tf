resource "google_project_service" "dataform_googleapis_com" {
  project = "75499681521"
  service = "dataform.googleapis.com"
}
# terraform import google_project_service.dataform_googleapis_com 75499681521/dataform.googleapis.com

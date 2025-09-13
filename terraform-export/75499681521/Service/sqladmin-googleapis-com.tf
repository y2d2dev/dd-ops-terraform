resource "google_project_service" "sqladmin_googleapis_com" {
  project = "75499681521"
  service = "sqladmin.googleapis.com"
}
# terraform import google_project_service.sqladmin_googleapis_com 75499681521/sqladmin.googleapis.com

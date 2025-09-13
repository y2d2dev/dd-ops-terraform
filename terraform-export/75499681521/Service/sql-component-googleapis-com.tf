resource "google_project_service" "sql_component_googleapis_com" {
  project = "75499681521"
  service = "sql-component.googleapis.com"
}
# terraform import google_project_service.sql_component_googleapis_com 75499681521/sql-component.googleapis.com

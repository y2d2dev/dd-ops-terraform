resource "google_project_service" "osconfig_googleapis_com" {
  project = "75499681521"
  service = "osconfig.googleapis.com"
}
# terraform import google_project_service.osconfig_googleapis_com 75499681521/osconfig.googleapis.com

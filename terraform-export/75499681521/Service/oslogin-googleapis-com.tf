resource "google_project_service" "oslogin_googleapis_com" {
  project = "75499681521"
  service = "oslogin.googleapis.com"
}
# terraform import google_project_service.oslogin_googleapis_com 75499681521/oslogin.googleapis.com

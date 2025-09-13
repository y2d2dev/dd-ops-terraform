resource "google_project_service" "vpcaccess_googleapis_com" {
  project = "75499681521"
  service = "vpcaccess.googleapis.com"
}
# terraform import google_project_service.vpcaccess_googleapis_com 75499681521/vpcaccess.googleapis.com

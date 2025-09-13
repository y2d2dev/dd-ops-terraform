resource "google_project_service" "dns_googleapis_com" {
  project = "75499681521"
  service = "dns.googleapis.com"
}
# terraform import google_project_service.dns_googleapis_com 75499681521/dns.googleapis.com

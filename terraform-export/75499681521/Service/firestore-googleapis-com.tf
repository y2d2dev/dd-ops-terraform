resource "google_project_service" "firestore_googleapis_com" {
  project = "75499681521"
  service = "firestore.googleapis.com"
}
# terraform import google_project_service.firestore_googleapis_com 75499681521/firestore.googleapis.com

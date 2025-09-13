resource "google_project_service" "pubsub_googleapis_com" {
  project = "75499681521"
  service = "pubsub.googleapis.com"
}
# terraform import google_project_service.pubsub_googleapis_com 75499681521/pubsub.googleapis.com

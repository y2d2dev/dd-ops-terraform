resource "google_pubsub_topic" "ocr_prod" {
  name    = "ocr-prod"
  project = "reflected-flux-462908-s6"
}
# terraform import google_pubsub_topic.ocr_prod projects/reflected-flux-462908-s6/topics/ocr-prod

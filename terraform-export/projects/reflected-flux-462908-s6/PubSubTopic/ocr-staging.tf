resource "google_pubsub_topic" "ocr_staging" {
  name    = "ocr-staging"
  project = "reflected-flux-462908-s6"
}
# terraform import google_pubsub_topic.ocr_staging projects/reflected-flux-462908-s6/topics/ocr-staging

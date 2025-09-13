resource "google_pubsub_topic" "ocr_staging_dlq" {
  name    = "ocr-staging-dlq"
  project = "reflected-flux-462908-s6"
}
# terraform import google_pubsub_topic.ocr_staging_dlq projects/reflected-flux-462908-s6/topics/ocr-staging-dlq

resource "google_pubsub_subscription" "ocr_subscription_produnction" {
  ack_deadline_seconds = 600

  expiration_policy {
    ttl = "2678400s"
  }

  message_retention_duration = "604800s"
  name                       = "ocr-subscription-produnction"
  project                    = "reflected-flux-462908-s6"

  push_config {
    push_endpoint = "https://ocr-prod-75499681521.asia-northeast1.run.app/pubsub/push"
  }

  topic = "projects/reflected-flux-462908-s6/topics/ocr-prod"
}
# terraform import google_pubsub_subscription.ocr_subscription_produnction projects/reflected-flux-462908-s6/subscriptions/ocr-subscription-produnction

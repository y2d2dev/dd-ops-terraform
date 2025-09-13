resource "google_pubsub_subscription" "ocr_subscription_staging" {
  ack_deadline_seconds = 600

  expiration_policy {
    ttl = "2678400s"
  }

  message_retention_duration = "604800s"
  name                       = "ocr-subscription-staging"
  project                    = "reflected-flux-462908-s6"

  push_config {
    oidc_token {
      service_account_email = "75499681521-compute@developer.gserviceaccount.com"
    }

    push_endpoint = "https://dd-ops-ocr-api-v2-75499681521.asia-northeast1.run.app/pubsub/push"
  }

  retry_policy {
    maximum_backoff = "600s"
    minimum_backoff = "599s"
  }

  topic = "projects/reflected-flux-462908-s6/topics/ocr-staging"
}
# terraform import google_pubsub_subscription.ocr_subscription_staging projects/reflected-flux-462908-s6/subscriptions/ocr-subscription-staging

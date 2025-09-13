resource "google_service_account" "cb_notifier" {
  account_id   = "cb-notifier"
  display_name = "Cloud Build Slack Notifier"
  project      = "reflected-flux-462908-s6"
}
# terraform import google_service_account.cb_notifier projects/reflected-flux-462908-s6/serviceAccounts/cb-notifier@reflected-flux-462908-s6.iam.gserviceaccount.com

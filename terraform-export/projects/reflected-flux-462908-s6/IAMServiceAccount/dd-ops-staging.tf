resource "google_service_account" "dd_ops_staging" {
  account_id   = "dd-ops-staging"
  display_name = "dd-ops-staging"
  project      = "reflected-flux-462908-s6"
}
# terraform import google_service_account.dd_ops_staging projects/reflected-flux-462908-s6/serviceAccounts/dd-ops-staging@reflected-flux-462908-s6.iam.gserviceaccount.com

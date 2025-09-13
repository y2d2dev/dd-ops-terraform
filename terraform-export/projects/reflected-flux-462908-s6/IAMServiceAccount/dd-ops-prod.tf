resource "google_service_account" "dd_ops_prod" {
  account_id   = "dd-ops-prod"
  display_name = "dd-ops-prod"
  project      = "reflected-flux-462908-s6"
}
# terraform import google_service_account.dd_ops_prod projects/reflected-flux-462908-s6/serviceAccounts/dd-ops-prod@reflected-flux-462908-s6.iam.gserviceaccount.com

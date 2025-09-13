resource "google_service_account" "mergy_system_stg" {
  account_id   = "mergy-system-stg"
  display_name = "mergy-system-stg"
  project      = "reflected-flux-462908-s6"
}
# terraform import google_service_account.mergy_system_stg projects/reflected-flux-462908-s6/serviceAccounts/mergy-system-stg@reflected-flux-462908-s6.iam.gserviceaccount.com

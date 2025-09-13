resource "google_service_account" "storage_url_signer" {
  account_id   = "storage-url-signer"
  description  = "Cloud Storageの署名付きURL生成用"
  display_name = "storage-url-signer"
  project      = "reflected-flux-462908-s6"
}
# terraform import google_service_account.storage_url_signer projects/reflected-flux-462908-s6/serviceAccounts/storage-url-signer@reflected-flux-462908-s6.iam.gserviceaccount.com

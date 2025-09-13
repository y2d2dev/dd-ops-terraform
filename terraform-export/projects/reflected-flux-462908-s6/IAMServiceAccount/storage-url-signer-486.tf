resource "google_service_account" "storage_url_signer_486" {
  account_id   = "storage-url-signer-486"
  description  = "Cloud Storageの署名付きURL生成用"
  display_name = "storage-url-signer"
  project      = "reflected-flux-462908-s6"
}
# terraform import google_service_account.storage_url_signer_486 projects/reflected-flux-462908-s6/serviceAccounts/storage-url-signer-486@reflected-flux-462908-s6.iam.gserviceaccount.com

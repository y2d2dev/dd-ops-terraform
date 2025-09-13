resource "google_service_account" "file_upload" {
  account_id   = "file-upload"
  description  = "ファイルアップロードを行うためのアカウント"
  display_name = "file-upload"
  project      = "reflected-flux-462908-s6"
}
# terraform import google_service_account.file_upload projects/reflected-flux-462908-s6/serviceAccounts/file-upload@reflected-flux-462908-s6.iam.gserviceaccount.com

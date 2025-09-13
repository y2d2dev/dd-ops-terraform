resource "google_service_account" "cdb_access_stg_storage_bucket" {
  account_id   = "cdb-access-stg-storage-bucket"
  description  = "CDNがstgのCloud Storageのバケットに対してアクセスするためのもの"
  display_name = "cdb-access-stg-storage-bucket"
  project      = "reflected-flux-462908-s6"
}
# terraform import google_service_account.cdb_access_stg_storage_bucket projects/reflected-flux-462908-s6/serviceAccounts/cdb-access-stg-storage-bucket@reflected-flux-462908-s6.iam.gserviceaccount.com

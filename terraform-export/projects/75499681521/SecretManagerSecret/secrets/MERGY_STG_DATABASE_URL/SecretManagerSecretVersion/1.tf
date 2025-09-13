resource "google_secret_manager_secret_version" "1" {
  deletion_policy = "DELETE"
  enabled         = true
  secret          = "projects/75499681521/secrets/MERGY_STG_DATABASE_URL"
  secret_data     = "postgresql://postgres:C-;1gn}sa^s]H\\1@@10.23.112.3/mergy_system_stg"
}
# terraform import google_secret_manager_secret_version.1 projects/75499681521/secrets/MERGY_STG_DATABASE_URL/versions/1

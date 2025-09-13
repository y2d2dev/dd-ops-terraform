resource "google_secret_manager_secret" "mergy_stg_database_url" {
  project   = "75499681521"
  secret_id = "MERGY_STG_DATABASE_URL"
}
# terraform import google_secret_manager_secret.mergy_stg_database_url projects/75499681521/secrets/MERGY_STG_DATABASE_URL

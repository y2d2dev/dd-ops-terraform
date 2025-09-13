resource "google_storage_bucket" "dd_ops_models" {
  force_destroy               = false
  location                    = "ASIA-NORTHEAST1"
  name                        = "dd_ops_models"
  project                     = "reflected-flux-462908-s6"
  public_access_prevention    = "enforced"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
}
# terraform import google_storage_bucket.dd_ops_models dd_ops_models

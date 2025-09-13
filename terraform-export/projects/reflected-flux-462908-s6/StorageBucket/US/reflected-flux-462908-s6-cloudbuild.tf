resource "google_storage_bucket" "reflected_flux_462908_s6_cloudbuild" {
  force_destroy               = false
  location                    = "US"
  name                        = "reflected-flux-462908-s6_cloudbuild"
  project                     = "reflected-flux-462908-s6"
  public_access_prevention    = "inherited"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
}
# terraform import google_storage_bucket.reflected_flux_462908_s6_cloudbuild reflected-flux-462908-s6_cloudbuild

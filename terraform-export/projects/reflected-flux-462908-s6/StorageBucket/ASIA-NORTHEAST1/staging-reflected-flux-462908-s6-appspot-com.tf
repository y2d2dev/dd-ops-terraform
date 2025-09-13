resource "google_storage_bucket" "staging_reflected_flux_462908_s6_appspot_com" {
  force_destroy = false

  lifecycle_rule {
    action {
      type = "Delete"
    }

    condition {
      age        = 15
      with_state = "ANY"
    }
  }

  location                    = "ASIA-NORTHEAST1"
  name                        = "staging.reflected-flux-462908-s6.appspot.com"
  project                     = "reflected-flux-462908-s6"
  public_access_prevention    = "inherited"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
}
# terraform import google_storage_bucket.staging_reflected_flux_462908_s6_appspot_com staging.reflected-flux-462908-s6.appspot.com

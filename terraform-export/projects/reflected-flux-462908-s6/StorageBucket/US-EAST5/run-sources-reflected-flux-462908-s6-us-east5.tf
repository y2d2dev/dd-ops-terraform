resource "google_storage_bucket" "run_sources_reflected_flux_462908_s6_us_east5" {
  cors {
    method = ["GET"]
    origin = ["https://*.cloud.google.com", "https://*.corp.google.com", "https://*.corp.google.com:*", "https://*.cloud.google", "https://*.byoid.goog"]
  }

  force_destroy               = false
  location                    = "US-EAST5"
  name                        = "run-sources-reflected-flux-462908-s6-us-east5"
  project                     = "reflected-flux-462908-s6"
  public_access_prevention    = "inherited"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
}
# terraform import google_storage_bucket.run_sources_reflected_flux_462908_s6_us_east5 run-sources-reflected-flux-462908-s6-us-east5

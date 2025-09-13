resource "google_dns_managed_zone" "dd_ops" {
  cloud_logging_config {
    enable_logging = false
  }

  dns_name      = "dd-ops.net."
  force_destroy = false
  name          = "dd-ops"
  project       = "reflected-flux-462908-s6"
  visibility    = "public"
}
# terraform import google_dns_managed_zone.dd_ops projects/reflected-flux-462908-s6/managedZones/dd-ops

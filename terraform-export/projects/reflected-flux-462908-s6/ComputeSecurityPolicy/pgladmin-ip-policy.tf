resource "google_compute_security_policy" "pgladmin_ip_policy" {
  description = "IP restriction policy for pgAdmin"
  name        = "pgladmin-ip-policy"
  project     = "reflected-flux-462908-s6"

  rule {
    action      = "allow"
    description = "Allow specific IPs"

    match {
      expr {
        expression = "origin.ip == '125.102.255.98' || origin.ip == '162.120.184.17' || origin.ip == '58.93.68.7'"
      }
    }

    priority = 1000
  }

  rule {
    action      = "allow"
    description = "default rule"

    match {
      config {
        src_ip_ranges = ["*"]
      }

      versioned_expr = "SRC_IPS_V1"
    }

    priority = 2147483647
  }

  rule {
    action      = "deny(403)"
    description = "Deny all other IPs"

    match {
      expr {
        expression = "true"
      }
    }

    priority = 2000
  }

  type = "CLOUD_ARMOR"
}
# terraform import google_compute_security_policy.pgladmin_ip_policy projects/reflected-flux-462908-s6/global/securityPolicies/pgladmin-ip-policy

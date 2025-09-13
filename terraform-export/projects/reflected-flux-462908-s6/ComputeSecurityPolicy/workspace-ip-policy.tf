resource "google_compute_security_policy" "workspace_ip_policy" {
  advanced_options_config {
    json_parsing = "STANDARD"
    log_level    = "NORMAL"
  }

  description = "Workspace-based IP restrictions"
  name        = "workspace-ip-policy"
  project     = "reflected-flux-462908-s6"

  rule {
    action      = "allow"
    description = "Allow workspace 1 IPs"

    match {
      expr {
        expression = "request.path.startsWith('/app_contracts/1/') && inIpRange(origin.ip, '0.0.0.0/0')"
      }
    }

    priority = 1000
  }

  rule {
    action      = "allow"
    description = "Default rule, higher priority overrides it"

    match {
      config {
        src_ip_ranges = ["*"]
      }

      versioned_expr = "SRC_IPS_V1"
    }

    priority = 2147483647
  }

  type = "CLOUD_ARMOR"
}
# terraform import google_compute_security_policy.workspace_ip_policy projects/reflected-flux-462908-s6/global/securityPolicies/workspace-ip-policy

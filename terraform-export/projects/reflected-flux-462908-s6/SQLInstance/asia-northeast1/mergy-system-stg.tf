resource "google_sql_database_instance" "mergy_system_stg" {
  database_version    = "POSTGRES_17"
  instance_type       = "CLOUD_SQL_INSTANCE"
  maintenance_version = "POSTGRES_17_5.R20250727.00_14"
  name                = "mergy-system-stg"
  project             = "reflected-flux-462908-s6"
  region              = "asia-northeast1"

  settings {
    activation_policy = "ALWAYS"
    availability_type = "ZONAL"

    backup_configuration {
      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }

      enabled                        = true
      location                       = "asia"
      point_in_time_recovery_enabled = true
      start_time                     = "11:00"
      transaction_log_retention_days = 7
    }

    connector_enforcement       = "NOT_REQUIRED"
    deletion_protection_enabled = true
    disk_autoresize             = false
    disk_autoresize_limit       = 0
    disk_size                   = 10
    disk_type                   = "PD_SSD"
    edition                     = "ENTERPRISE"

    insights_config {
      query_string_length = 0
    }

    ip_configuration {
      ipv4_enabled    = true
      private_network = "projects/reflected-flux-462908-s6/global/networks/dd-ops-staging-vpc"
    }

    location_preference {
      zone = "asia-northeast1-b"
    }

    maintenance_window {
      update_track = "canary"
    }

    password_validation_policy {
      complexity                  = "COMPLEXITY_DEFAULT"
      disallow_username_substring = true
      enable_password_policy      = true
      min_length                  = 8
    }

    pricing_plan = "PER_USE"
    tier         = "db-custom-4-16384"
  }
}
# terraform import google_sql_database_instance.mergy_system_stg projects/reflected-flux-462908-s6/instances/mergy-system-stg

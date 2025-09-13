resource "google_sql_database_instance" "dd_ops_db" {
  database_version    = "POSTGRES_15"
  instance_type       = "CLOUD_SQL_INSTANCE"
  maintenance_version = "POSTGRES_15_13.R20250302.00_31"
  name                = "dd-ops-db"
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
      start_time                     = "06:00"
      transaction_log_retention_days = 7
    }

    connector_enforcement       = "NOT_REQUIRED"
    deletion_protection_enabled = true
    disk_autoresize             = true
    disk_autoresize_limit       = 0
    disk_size                   = 10
    disk_type                   = "PD_HDD"
    edition                     = "ENTERPRISE"

    insights_config {
      query_string_length = 0
    }

    ip_configuration {
      authorized_networks {
        name  = "Sakurai"
        value = "111.188.248.7"
      }

      authorized_networks {
        name  = "office"
        value = "72.14.201.171"
      }

      enable_private_path_for_google_cloud_services = true
      ipv4_enabled                                  = true
      private_network                               = "projects/reflected-flux-462908-s6/global/networks/dd-ops-vpc"
    }

    location_preference {
      zone = "asia-northeast1-b"
    }

    maintenance_window {
      day          = 5
      hour         = 15
      update_track = "stable"
    }

    pricing_plan = "PER_USE"
    tier         = "db-custom-2-8192"
  }
}
# terraform import google_sql_database_instance.dd_ops_db projects/reflected-flux-462908-s6/instances/dd-ops-db

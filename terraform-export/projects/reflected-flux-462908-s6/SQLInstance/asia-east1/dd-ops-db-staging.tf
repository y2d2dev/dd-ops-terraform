resource "google_sql_database_instance" "dd_ops_db_staging" {
  database_version    = "POSTGRES_17"
  instance_type       = "CLOUD_SQL_INSTANCE"
  maintenance_version = "POSTGRES_17_5.R20250727.00_14"
  name                = "dd-ops-db-staging"
  project             = "reflected-flux-462908-s6"
  region              = "asia-east1"

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
      start_time                     = "12:00"
      transaction_log_retention_days = 7
    }

    connector_enforcement = "NOT_REQUIRED"

    database_flags {
      name  = "cloudsql.enable_pgaudit"
      value = "on"
    }

    database_flags {
      name  = "pgaudit.log"
      value = "read,write"
    }

    deletion_protection_enabled = true
    disk_autoresize             = true
    disk_autoresize_limit       = 0
    disk_size                   = 10
    disk_type                   = "PD_SSD"
    edition                     = "ENTERPRISE"

    insights_config {
      query_string_length = 0
    }

    ip_configuration {
      authorized_networks {
        name  = "office"
        value = "58.93.68.7"
      }

      authorized_networks {
        name  = "sakurai"
        value = "111.188.248.7"
      }

      ipv4_enabled    = true
      private_network = "projects/reflected-flux-462908-s6/global/networks/dd-ops-vpc"
    }

    location_preference {
      zone = "asia-east1-c"
    }

    maintenance_window {
      update_track = "canary"
    }

    pricing_plan = "PER_USE"
    tier         = "db-custom-2-8192"
  }
}
# terraform import google_sql_database_instance.dd_ops_db_staging projects/reflected-flux-462908-s6/instances/dd-ops-db-staging

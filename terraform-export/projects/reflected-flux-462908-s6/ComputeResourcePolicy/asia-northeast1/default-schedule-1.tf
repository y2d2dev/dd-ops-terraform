resource "google_compute_resource_policy" "default_schedule_1" {
  name    = "default-schedule-1"
  project = "reflected-flux-462908-s6"
  region  = "asia-northeast1"

  snapshot_schedule_policy {
    retention_policy {
      max_retention_days    = 14
      on_source_disk_delete = "KEEP_AUTO_SNAPSHOTS"
    }

    schedule {
      daily_schedule {
        days_in_cycle = 1
        start_time    = "20:00"
      }
    }
  }
}
# terraform import google_compute_resource_policy.default_schedule_1 projects/reflected-flux-462908-s6/regions/asia-northeast1/resourcePolicies/default-schedule-1

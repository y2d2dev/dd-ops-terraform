resource "google_compute_snapshot" "prod_jump_host_inst_asia_northeast1_a_20250903202310_ivjoabp7" {
  name              = "prod-jump-host-inst-asia-northeast1-a-20250903202310-ivjoabp7"
  project           = "reflected-flux-462908-s6"
  source_disk       = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/zones/asia-northeast1-a/disks/prod-jump-host-instance"
  storage_locations = ["asia"]
}
# terraform import google_compute_snapshot.prod_jump_host_inst_asia_northeast1_a_20250903202310_ivjoabp7 projects/reflected-flux-462908-s6/global/snapshots/prod-jump-host-inst-asia-northeast1-a-20250903202310-ivjoabp7

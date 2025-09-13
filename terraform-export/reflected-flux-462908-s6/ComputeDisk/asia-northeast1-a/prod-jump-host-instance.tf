resource "google_compute_disk" "prod_jump_host_instance" {
  guest_os_features {
    type = "GVNIC"
  }

  guest_os_features {
    type = "SEV_CAPABLE"
  }

  guest_os_features {
    type = "SEV_LIVE_MIGRATABLE_V2"
  }

  guest_os_features {
    type = "UEFI_COMPATIBLE"
  }

  guest_os_features {
    type = "VIRTIO_SCSI_MULTIQUEUE"
  }

  image                     = "https://www.googleapis.com/compute/beta/projects/debian-cloud/global/images/debian-12-bookworm-v20250709"
  licenses                  = ["https://www.googleapis.com/compute/v1/projects/debian-cloud/global/licenses/debian-12-bookworm"]
  name                      = "prod-jump-host-instance"
  physical_block_size_bytes = 4096
  project                   = "reflected-flux-462908-s6"
  resource_policies         = ["https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/regions/asia-northeast1/resourcePolicies/default-schedule-1"]
  size                      = 10
  type                      = "pd-balanced"
  zone                      = "asia-northeast1-a"
}
# terraform import google_compute_disk.prod_jump_host_instance projects/reflected-flux-462908-s6/zones/asia-northeast1-a/disks/prod-jump-host-instance

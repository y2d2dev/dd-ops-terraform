resource "google_compute_instance" "prod_jump_host_instance" {
  boot_disk {
    auto_delete = true
    device_name = "prod-jump-host-instance"

    initialize_params {
      image = "https://www.googleapis.com/compute/beta/projects/debian-cloud/global/images/debian-12-bookworm-v20250709"
      size  = 10
      type  = "pd-balanced"
    }

    mode   = "READ_WRITE"
    source = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/zones/asia-northeast1-a/disks/prod-jump-host-instance"
  }

  confidential_instance_config {
    enable_confidential_compute = false
  }

  labels = {
    goog-ops-agent-policy = "v2-x86-template-1-4-0"
  }

  machine_type = "e2-micro"

  metadata = {
    enable-osconfig = "TRUE"
    ssh-keys        = "dev:ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEM7b7I5K+IS8yysv7nLaFpZYagut8rcDiOLZNZU+SGa83WnFozU4xYaFjbxQQLjAhbGWPQmKcjUQJPiA+qXBA0= google-ssh {\"userName\":\"dev@y2-d2.com\",\"expireOn\":\"2025-08-09T15:09:08+0000\"}"
  }

  name = "prod-jump-host-instance"

  network_interface {
    access_config {
      nat_ip       = "35.194.114.180"
      network_tier = "PREMIUM"
    }

    network            = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/networks/dd-ops-vpc"
    network_ip         = "10.0.0.2"
    stack_type         = "IPV4_ONLY"
    subnetwork         = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/regions/asia-northeast1/subnetworks/dd-ops-subnet"
    subnetwork_project = "reflected-flux-462908-s6"
  }

  project = "reflected-flux-462908-s6"

  reservation_affinity {
    type = "ANY_RESERVATION"
  }

  scheduling {
    automatic_restart   = true
    on_host_maintenance = "MIGRATE"
    provisioning_model  = "STANDARD"
  }

  service_account {
    email  = "75499681521-compute@developer.gserviceaccount.com"
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  shielded_instance_config {
    enable_integrity_monitoring = true
    enable_vtpm                 = true
  }

  tags = ["jump-host"]
  zone = "asia-northeast1-a"
}
# terraform import google_compute_instance.prod_jump_host_instance projects/reflected-flux-462908-s6/zones/asia-northeast1-a/instances/prod-jump-host-instance

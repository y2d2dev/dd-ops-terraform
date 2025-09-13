resource "google_compute_firewall" "allow_ssh_from_office" {
  allow {
    ports    = ["22"]
    protocol = "tcp"
  }

  description   = "officeからのssh接続を許可するものです"
  direction     = "INGRESS"
  name          = "allow-ssh-from-office"
  network       = "https://www.googleapis.com/compute/v1/projects/reflected-flux-462908-s6/global/networks/dd-ops-vpc"
  priority      = 100
  project       = "reflected-flux-462908-s6"
  source_ranges = ["35.235.240.0", "58.93.68.7"]
  target_tags   = ["jump-host"]
}
# terraform import google_compute_firewall.allow_ssh_from_office projects/reflected-flux-462908-s6/global/firewalls/allow-ssh-from-office

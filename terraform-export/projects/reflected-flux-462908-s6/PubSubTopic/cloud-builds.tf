resource "google_pubsub_topic" "cloud_builds" {
  name    = "cloud-builds"
  project = "reflected-flux-462908-s6"
}
# terraform import google_pubsub_topic.cloud_builds projects/reflected-flux-462908-s6/topics/cloud-builds

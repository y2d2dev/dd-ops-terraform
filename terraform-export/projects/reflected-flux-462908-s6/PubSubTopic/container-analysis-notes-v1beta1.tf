resource "google_pubsub_topic" "container_analysis_notes_v1beta1" {
  name    = "container-analysis-notes-v1beta1"
  project = "reflected-flux-462908-s6"
}
# terraform import google_pubsub_topic.container_analysis_notes_v1beta1 projects/reflected-flux-462908-s6/topics/container-analysis-notes-v1beta1

resource "google_project" "reflected_flux_462908_s6" {
  auto_create_network = true
  billing_account     = "01A859-312BBA-2708BA"

  labels = {
    generative-language = "enabled"
  }

  name       = "My First Project"
  org_id     = "26369662084"
  project_id = "reflected-flux-462908-s6"
}
# terraform import google_project.reflected_flux_462908_s6 projects/reflected-flux-462908-s6

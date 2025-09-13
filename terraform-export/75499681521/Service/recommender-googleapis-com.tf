resource "google_project_service" "recommender_googleapis_com" {
  project = "75499681521"
  service = "recommender.googleapis.com"
}
# terraform import google_project_service.recommender_googleapis_com 75499681521/recommender.googleapis.com

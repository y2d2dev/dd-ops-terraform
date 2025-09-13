resource "google_apikeys_key" "1c7c974a_7dfe_414b_ba43_77590beab85f" {
  display_name = "Generative Language API Key"
  name         = "1c7c974a-7dfe-414b-ba43-77590beab85f"
  project      = "75499681521"

  restrictions {
    api_targets {
      service = "generativelanguage.googleapis.com"
    }
  }
}
# terraform import google_apikeys_key.1c7c974a_7dfe_414b_ba43_77590beab85f projects/75499681521/locations/global/keys/1c7c974a-7dfe-414b-ba43-77590beab85f

resource "google_document_ai_processor" "f0c0882dbb23e19a" {
  display_name = "mergy-system-test"
  location     = "us"
  project      = "75499681521"
  type         = "FORM_PARSER_PROCESSOR"
}
# terraform import google_document_ai_processor.f0c0882dbb23e19a projects/75499681521/locations/us/processors/f0c0882dbb23e19a

resource "google_document_ai_processor" "599b6ebb19fa1478" {
  display_name = "ocr-pro"
  location     = "us"
  project      = "75499681521"
  type         = "OCR_PROCESSOR"
}
# terraform import google_document_ai_processor.599b6ebb19fa1478 projects/75499681521/locations/us/processors/599b6ebb19fa1478

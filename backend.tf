# ========================================
# Terraform State Backend Configuration
# ========================================

# GCS Backend for storing Terraform state
# Uncomment and configure this block after creating the state bucket

/*
terraform {
  backend "gcs" {
    bucket = "dd-ops-terraform-state-prod"  # Replace with your state bucket name
    prefix = "terraform/state"
  }
}
*/

# ========================================
# State Bucket Resource (Initial Setup)
# ========================================
# Run this first to create the state bucket, then configure the backend above

resource "google_storage_bucket" "terraform_state" {
  name     = "${var.project_id}-terraform-state-${var.environment}"
  location = var.region

  force_destroy = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  uniform_bucket_level_access = true

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "terraform-state"
  }
}

# ========================================
# State Lock Table (Optional - for state locking)
# ========================================
# Note: GCS backend handles locking automatically,
# but you can use Cloud Firestore for additional locking if needed

/*
resource "google_firestore_database" "terraform_locks" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # Only create if using Firestore for state locking
  count = var.enable_state_locking ? 1 : 0
}
*/
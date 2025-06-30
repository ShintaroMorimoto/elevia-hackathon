# Configure Terraform and required providers
# Updated: Changed VPC connector CIDR range to 10.9.0.0/28 to avoid subnet conflicts
# Trigger: VPC connector fully deleted, using subnet parameter for deployment
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
  }

  backend "gcs" {
    # Bucket name will be configured via init script or CLI
    # Key will be default to terraform.tfstate
  }
}

# Configure the Google Cloud Provider
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "sqladmin.googleapis.com", # Fixed: correct API name for Cloud SQL
    "cloudresourcemanager.googleapis.com",
    "compute.googleapis.com",
    "run.googleapis.com",
    "vpcaccess.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "iamcredentials.googleapis.com",
    "servicenetworking.googleapis.com"
  ])

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

# Generate random suffix for resources to ensure uniqueness
resource "random_id" "suffix" {
  byte_length = 4
}

# Create VPC network for Cloud SQL
resource "google_compute_network" "vpc_network" {
  name                    = "${var.app_name}-vpc-v2"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

# Create subnet for VPC connector
resource "google_compute_subnetwork" "vpc_connector_subnet" {
  name          = "${var.app_name}-connector-subnet-v2"
  ip_cidr_range = "10.9.0.0/28"
  region        = var.region
  network       = google_compute_network.vpc_network.id
}

# Allocate IP range for private service connection
resource "google_compute_global_address" "private_ip_range" {
  name          = "${var.app_name}-private-ip-v2"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 24
  network       = google_compute_network.vpc_network.id
  depends_on    = [google_project_service.apis]
}

# Create private VPC connection for Cloud SQL
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc_network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
  depends_on              = [google_project_service.apis]
}

# Create VPC Connector for Cloud Run to Cloud SQL communication
resource "google_vpc_access_connector" "connector" {
  name   = "${var.app_name}-connector-v2"
  region = var.region
  subnet {
    name = google_compute_subnetwork.vpc_connector_subnet.name
  }

  depends_on = [
    google_project_service.apis,
    google_compute_subnetwork.vpc_connector_subnet
  ]
}

# Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "postgres" {
  name             = "${var.app_name}-postgres-${random_id.suffix.hex}"
  database_version = "POSTGRES_15"
  region           = var.region

  # Proper timeout for Cloud SQL creation (can take 15-20 minutes)
  timeouts {
    create = "30m"
    update = "30m"
    delete = "30m"
  }

  settings {
    tier                        = var.db_tier
    deletion_protection_enabled = var.deletion_protection

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.vpc_network.id
      enable_private_path_for_google_cloud_services = true
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      location                       = var.region
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
      transaction_log_retention_days = 7
    }

    maintenance_window {
      day          = 7
      hour         = 4
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }

  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_project_service.apis
  ]

  deletion_protection = var.deletion_protection
}

# Create database
resource "google_sql_database" "database" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
}

# Create database user
resource "google_sql_user" "user" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# Artifact Registry repository for container images
resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = "${var.app_name}-repo"
  description   = "Docker repository for ${var.app_name}"
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}

# Note: Cloud Run service is managed by the deployment workflow
# Terraform only manages the supporting infrastructure (VPC, connector, database, etc.)

# Service account for Cloud Run
resource "google_service_account" "cloud_run_sa" {
  account_id   = "${var.app_name}-run-sa"
  display_name = "Cloud Run service account for ${var.app_name}"
}

# Import existing service account if it exists
import {
  to = google_service_account.cloud_run_sa
  id = "projects/${var.project_id}/serviceAccounts/${var.app_name}-run-sa@${var.project_id}.iam.gserviceaccount.com"
}

# Grant Cloud SQL client role to Cloud Run service account
resource "google_project_iam_member" "cloud_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Grant Secret Manager accessor role to Cloud Run service account
resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Secret Manager secrets
resource "google_secret_manager_secret" "db_password" {
  secret_id = "${var.app_name}-db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

# Import existing db password secret if it exists
import {
  to = google_secret_manager_secret.db_password
  id = "projects/${var.project_id}/secrets/${var.app_name}-db-password"
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

resource "google_secret_manager_secret" "nextauth_secret" {
  secret_id = "${var.app_name}-nextauth-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

# Import existing nextauth secret if it exists
import {
  to = google_secret_manager_secret.nextauth_secret
  id = "projects/${var.project_id}/secrets/${var.app_name}-nextauth-secret"
}

resource "google_secret_manager_secret_version" "nextauth_secret" {
  secret      = google_secret_manager_secret.nextauth_secret.id
  secret_data = var.nextauth_secret
}

# Google OAuth Client ID Secret
resource "google_secret_manager_secret" "google_oauth_client_id" {
  secret_id = "${var.app_name}-google-oauth-client-id"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "google_oauth_client_id" {
  secret      = google_secret_manager_secret.google_oauth_client_id.id
  secret_data = var.google_oauth_client_id
}

# Google OAuth Client Secret
resource "google_secret_manager_secret" "google_oauth_client_secret" {
  secret_id = "${var.app_name}-google-oauth-client-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "google_oauth_client_secret" {
  secret      = google_secret_manager_secret.google_oauth_client_secret.id
  secret_data = var.google_oauth_client_secret
}
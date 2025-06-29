# Cloud Run outputs
output "cloud_run_url" {
  description = "The URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.app.uri
}

output "cloud_run_service_name" {
  description = "The name of the Cloud Run service"
  value       = google_cloud_run_v2_service.app.name
}

# Cloud SQL outputs
output "cloud_sql_connection_name" {
  description = "The connection name for the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.connection_name
}

output "cloud_sql_instance_name" {
  description = "The name of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.name
}

output "cloud_sql_private_ip" {
  description = "The private IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.private_ip_address
}

output "database_name" {
  description = "The name of the created database"
  value       = google_sql_database.database.name
}

output "database_user" {
  description = "The database user name"
  value       = google_sql_user.user.name
  sensitive   = true
}

# VPC and networking outputs
output "vpc_network_name" {
  description = "The name of the VPC network"
  value       = google_compute_network.vpc_network.name
}

output "vpc_connector_name" {
  description = "The name of the VPC Access Connector"
  value       = google_vpc_access_connector.connector.name
}

# Artifact Registry outputs
output "artifact_registry_repository" {
  description = "The Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}"
}

output "docker_image_url" {
  description = "The full Docker image URL for deployment"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}/${var.app_name}:latest"
}

# Secret Manager outputs
output "db_password_secret_name" {
  description = "The name of the database password secret"
  value       = google_secret_manager_secret.db_password.secret_id
}

output "nextauth_secret_name" {
  description = "The name of the NextAuth secret"
  value       = google_secret_manager_secret.nextauth_secret.secret_id
}

# Service Account outputs
output "cloud_run_service_account_email" {
  description = "The email of the Cloud Run service account"
  value       = google_service_account.cloud_run_sa.email
}

# Project configuration outputs
output "project_id" {
  description = "The Google Cloud project ID"
  value       = var.project_id
}

output "region" {
  description = "The Google Cloud region"
  value       = var.region
}
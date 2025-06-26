variable "app_name" {
  description = "Koyeb app name"
  type        = string
  default     = "backend-tyvaa"
}

variable "service_name" {
  description = "Koyeb service name"
  type        = string
  default     = "backend-tyvaa-service"
}


variable "database_url" {
  description = "Database connection string"
  type        = string
}

variable "docker_hub_user" {
  description = "Docker Hub username"
  type        = string
  default     = "tyvaa"
}



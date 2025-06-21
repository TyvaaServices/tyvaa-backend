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


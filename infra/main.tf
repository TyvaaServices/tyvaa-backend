terraform {
  required_providers {
    koyeb = {
      source = "koyeb/koyeb"
      version = "0.1.2"
    }
  }
}



resource "koyeb_app" "backend" {
  name = var.app_name
}

resource "koyeb_service" "backend_service" {
  app_name = koyeb_app.backend.name
  definition {
    name = var.service_name
    instance_types {
      type = "free"
    }
    ports {
      port     = 3000
      protocol = "http"
    }
    scalings {
      min = 0
      max = 1
    }
    env {
      key   = "PORT"
      value = "3000"
    }
    env {
      key   = "DATABASE_URL"
      value = var.database_url
    }
    routes {
      path = "/"
      port = 3000
    }

    regions = ["fra"]
    git {
      repository = "github.com/traorecheikh/backend-tyvaa"
      branch     = "dev-test"
    }
  }
  depends_on = [
    koyeb_app.backend
  ]
}






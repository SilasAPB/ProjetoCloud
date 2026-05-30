terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  
  region = "us-east-1"
}

# ==========================================
# 1. FILA SQS (Para o processamento assíncrono)
# ==========================================
resource "aws_sqs_queue" "payments_queue" {
  name                      = "payments-queue"
  delay_seconds             = 0
  max_message_size          = 262144 # 256 KB
  message_retention_seconds = 86400  # 1 dia
  receive_wait_time_seconds = 10     # Long polling
}

# ==========================================
# 2. TABELAS DYNAMODB (NoSQL)
# ==========================================

# Tabela User
resource "aws_dynamodb_table" "users" {
  name         = "Users"
  billing_mode = "PAY_PER_REQUEST" # Escala infinitamente e não cobra idle
  hash_key     = "userID"

  attribute {
    name = "userID"
    type = "S" # S = String (UUID)
  }
}

# Tabela Event
resource "aws_dynamodb_table" "events" {
  name         = "Events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "eventID"

  attribute {
    name = "eventID"
    type = "S" # S = String (UUID)
  }
}

# Tabela Payment
resource "aws_dynamodb_table" "payments" {
  name         = "Payments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "paymentID"

  attribute {
    name = "paymentID"
    type = "S" # S = String (UUID)
  }

  attribute {
    name = "userID"
    type = "S"
  }

  attribute {
    name = "eventID"
    type = "S"
  }

  global_secondary_index {
    name            = "UserPaymentsIndex"
    hash_key        = "userID"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "EventPaymentsIndex"
    hash_key        = "eventID"
    projection_type = "ALL"
  }
}

# ==========================================
# OUTPUTS (Para facilitar o uso depois)
# ==========================================
output "sqs_queue_url" {
  value = aws_sqs_queue.payments_queue.id
}

output "sqs_queue_arn" {
  value = aws_sqs_queue.payments_queue.arn
}

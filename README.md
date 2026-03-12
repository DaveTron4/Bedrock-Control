# Bedrock Control 🎮☁️

**Bedrock Control** is a professional-grade, event-driven orchestration tool designed to manage Minecraft servers on AWS. It bridges the gap between on-premise hardware (Raspberry Pi) and cloud scalability, ensuring your server is available on-demand while keeping operational costs near zero.

---

## 📖 Project Overview

The "Host Hostage" crisis is over. No more waiting for that one friend to wake up and turn on their PC. **Bedrock Control** allows any authorized Discord member to "wake up" the server. Once the fun is over and the server is empty, the "Janitor" logic automatically backs up the world to S3 and shuts down the instance to save money.

### Why this project exists:
* **Accessibility:** Decentralizes server control to the squad via Discord.
* **Cost Optimization:** Uses a "Pay-as-you-go" model, idling at $0 when not in use.
* **Cybersecurity:** Implements the **Principle of Least Privilege** and **Zero-Trust** identity for on-premise hardware.

---

## 🛠️ Technology Stack

![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Terraform](https://img.shields.io/badge/terraform-%235835CC.svg?style=for-the-badge&logo=terraform&logoColor=white)
![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-C51A4A?style=for-the-badge&logo=Raspberry-Pi&logoColor=white)
![Discord.js](https://img.shields.io/badge/discord.js-%235865F2.svg?style=for-the-badge&logo=discord&logoColor=white)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)

| Technology | Purpose |
| :--- | :--- |
| **AWS EC2 (t4g.small)** | High-performance ARM-based compute for the Minecraft server. |
| **AWS Lambda** | The "Janitor" that checks player counts and manages shutdown logic. |
| **AWS S3 & Glacier** | Reliable world persistence and long-term archival for "broke" students. |
| **IAM Roles Anywhere** | Securely grants temporary AWS credentials to the Raspberry Pi using certificates. |
| **Terraform** | Infrastructure as Code (IaC) to ensure the entire stack is repeatable. |
| **Cloudflare API** | Dynamic DNS (DDNS) to map a custom domain to the server's changing IP. |
| **Docker** | Containerizes the Discord bot for consistent deployment on the Pi. |

---

## 🏗️ Cloud Architecture

The architecture is designed to be **event-driven**. We don't poll; we react.

### The Workflow:
1.  **Trigger:** An Admin issues a `/start` command. The **Raspberry Pi** (authorized via **IAM Roles Anywhere**) tells AWS to boot the EC2.
2.  **Provision:** The EC2 runs a **User Data script** that:
    * Pulls the latest `world.zip` from **S3**.
    * Updates the **Cloudflare DNS** with its new Public IP.
    * Hits a **Discord Webhook** to announce: "Server is Live!"
3.  **Monitor:** **EventBridge** triggers a **Lambda** every 15 minutes. The Lambda uses the **RCON Protocol** to query the server's player count.
4.  **Cleanup:** If `players == 0`, the Lambda saves the game, pushes the update to S3, and stops the instance.

---

## 🔐 Security & Operations

* **Identity:** No long-term AWS Access Keys are stored on the Raspberry Pi. We use X.509 certificates to exchange for temporary sessions.
* **Networking:** No ports are opened on the home network. The bot uses an outbound WebSocket to communicate with Discord.
* **Observability:** A **CloudWatch Dashboard** monitors CPU, memory usage, and billing metrics in real-time.
* **Automation:** All AWS resources are managed via **Terraform**. To deploy the entire stack, simply run:
    ```bash
    terraform apply
    ```

---

## 🚀 Getting Started

1.  **Infrastructure:** Navigate to `/terraform` and run `terraform init && terraform apply`.
2.  **Bot Deployment:** Build the Docker image on your Raspberry Pi:
    ```bash
    docker-compose up -d --build
    ```
3.  **Certificates:** Ensure your Pi's certificate is registered in the **AWS IAM Roles Anywhere** trust anchor.

---

> **Note:** This project is currently configured for Minecraft Java Edition. Ensure your EC2 `Security Group` allows traffic on port `25565`.

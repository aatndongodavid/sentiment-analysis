"""
Script optionnel de monitoring.
Dans cette version (API serverless), les logs ne sont pas générés localement.
Ce script peut être adapté pour récupérer des logs depuis une source externe
et les agréger dans un dataset Hugging Face.

Actuellement, il sert de placeholder pour une future évolution.
"""
import os

HF_USERNAME = os.getenv("HF_USERNAME")
HF_TOKEN = os.getenv("HF_TOKEN")
LOGS_REPO_ID = f"{HF_USERNAME}/sentiment-logs"


def main():
    print("Monitoring désactivé dans cette version (API serverless).")
    print(
        "Pour activer le monitoring, intégrez un stockage de logs "
        "(ex: base de données, fichier distant)."
    )


if __name__ == "__main__":
    main()

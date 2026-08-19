import os

from datasets import load_dataset
from transformers import (
    DistilBertForSequenceClassification,
    DistilBertTokenizer,
    Trainer,
    TrainingArguments,
)

MODEL_NAME = "distilbert-base-uncased"
MAX_LENGTH = 256
BATCH_SIZE = 16
EPOCHS = 2
SAMPLE_SIZE = 5000  # 5000 exemples pour rester rapide


def main():
    # Chargement du dataset IMDB
    dataset = load_dataset("stanfordnlp/imdb", split=f"train[:{SAMPLE_SIZE}]")
    tokenizer = DistilBertTokenizer.from_pretrained(MODEL_NAME)

    def tokenize_function(examples):
        return tokenizer(
            examples["text"],
            padding="max_length",
            truncation=True,
            max_length=MAX_LENGTH,
        )

    # Tokenisation
    tokenized_dataset = dataset.map(tokenize_function, batched=True)
    tokenized_dataset = tokenized_dataset.rename_column("label", "labels")
    tokenized_dataset.set_format(
        "torch", columns=["input_ids", "attention_mask", "labels"]
    )

    # Modèle
    model = DistilBertForSequenceClassification.from_pretrained(
        MODEL_NAME, num_labels=2
    )

    # Arguments d'entraînement
    training_args = TrainingArguments(
        output_dir="./results",
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        evaluation_strategy="no",
        save_strategy="no",
        logging_dir="./logs",
        logging_steps=50,
    )

    # Entraîneur
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
    )

    # Entraînement
    trainer.train()

    # Sauvegarde du modèle et du tokenizer
    os.makedirs("model", exist_ok=True)
    model.save_pretrained("model")
    tokenizer.save_pretrained("model")
    print("Modèle entraîné et sauvegardé dans ./model")


if __name__ == "__main__":
    main()

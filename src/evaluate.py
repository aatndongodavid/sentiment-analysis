import argparse

import numpy as np
import torch
from datasets import load_dataset
from sklearn.metrics import accuracy_score, f1_score
from transformers import DistilBertForSequenceClassification, DistilBertTokenizer


def load_model(model_dir):
    tokenizer = DistilBertTokenizer.from_pretrained(model_dir)
    model = DistilBertForSequenceClassification.from_pretrained(model_dir)
    model.eval()
    return tokenizer, model


def predict_batch(tokenizer, model, texts, batch_size=32):
    predictions = []
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i : i + batch_size]
        inputs = tokenizer(
            batch_texts,
            padding=True,
            truncation=True,
            max_length=256,
            return_tensors="pt",
        )
        with torch.no_grad():
            outputs = model(**inputs)
        logits = outputs.logits
        preds = torch.argmax(logits, dim=-1).cpu().numpy()
        predictions.extend(preds)
    return np.array(predictions)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.85,
        help="Seuil minimal d'accuracy (défaut: 0.85)",
    )
    args = parser.parse_args()

    tokenizer, model = load_model("model")

    test_dataset = load_dataset("imdb", split="test[:1000]")
    X_test = test_dataset["text"]
    y_test = test_dataset["label"]

    y_pred = predict_batch(tokenizer, model, X_test)

    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"F1-score: {f1:.4f}")

    if accuracy < args.threshold:
        raise SystemExit(
            f"Accuracy {accuracy:.4f} inférieure au seuil {args.threshold}. Pipeline arrêté."
        )


if __name__ == "__main__":
    main()

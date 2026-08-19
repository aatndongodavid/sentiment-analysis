"""
Tests pour le module d'évaluation.
On vérifie les fonctions utilitaires et le seuil.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import evaluate

def test_predict_batch_shape():
    # Test de la forme de la sortie (sans chargement réel du modèle)
    # On utilise un faux tokenizer et modèle pour éviter les appels réseau
    class FakeTokenizer:
        def __call__(self, texts, **kwargs):
            # Retourne un objet avec input_ids, attention_mask, etc.
            # Pour simplifier, on utilise des torch tensors factices
            import torch
            return {
                "input_ids": torch.ones((len(texts), 10), dtype=torch.long),
                "attention_mask": torch.ones((len(texts), 10), dtype=torch.long),
            }

    class FakeModel:
        def __call__(self, **kwargs):
            # Retourne un objet avec logits aléatoires
            import torch
            class Output:
                def __init__(self, batch_size):
                    self.logits = torch.randn(batch_size, 2)
            return Output(len(kwargs["input_ids"]))
        def eval(self):
            pass

    tokenizer = FakeTokenizer()
    model = FakeModel()
    texts = ["test1", "test2", "test3"]
    preds = evaluate.predict_batch(tokenizer, model, texts, batch_size=2)
    assert preds.shape == (3,)
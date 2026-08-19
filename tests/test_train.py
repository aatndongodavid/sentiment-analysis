"""
Test simple pour vérifier que le script d'entraînement peut être importé sans erreur.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

def test_train_importable():
    import train
    assert hasattr(train, "main")

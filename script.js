// Remplacez par votre nom d'utilisateur Hugging Face
const HF_USERNAME = "Davidmeilleuraat";
const MODEL_NAME = "sentiment-model"; // nom du dépôt du modèle sur Hugging Face

async function analyzeSentiment() {
    const text = document.getElementById("text-input").value.trim();
    const resultDiv = document.getElementById("result");
    if (!text) {
        resultDiv.textContent = "Veuillez entrer un texte.";
        return;
    }

    resultDiv.textContent = "Analyse en cours...";

    // Appel à l'API d'inférence Hugging Face (gratuite, sans token si modèle public)
    const apiUrl = `https://api-inference.huggingface.co/models/${HF_USERNAME}/${MODEL_NAME}`;
    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: text }),
        });

        if (!response.ok) {
            resultDiv.textContent = `Erreur API : ${response.status} ${response.statusText}`;
            return;
        }

        const data = await response.json();
        // La réponse pour la classification est [[{label, score}, ...]]
        if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
            const scores = data[0];
            const top = scores.reduce((a, b) => (a.score > b.score ? a : b));
            const label = top.label;
            const confidence = top.score;
            const sentiment = label === "LABEL_1" ? "positif" : "négatif";
            resultDiv.innerHTML = `Sentiment : <strong>${sentiment}</strong><br>Confiance : ${(confidence * 100).toFixed(1)}%`;
        } else {
            resultDiv.textContent = "Réponse inattendue de l'API.";
            console.error(data);
        }
    } catch (error) {
        resultDiv.textContent = `Erreur réseau : ${error.message}`;
    }
}

document.getElementById("analyze-btn").addEventListener("click", analyzeSentiment);
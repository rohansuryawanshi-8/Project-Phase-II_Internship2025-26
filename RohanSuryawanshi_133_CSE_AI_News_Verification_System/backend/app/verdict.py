from __future__ import annotations

from .schemas import EvidenceItem, ModelSignal, Verdict


def make_verdict(evidence: list[EvidenceItem], model_signals: list[ModelSignal]) -> tuple[Verdict, int, int, str]:
    supports = [item for item in evidence if item.stance == "supports"]
    contradicts = [item for item in evidence if item.stance == "contradicts"]
    support_score = sum(item.similarity * item.stance_score for item in supports)
    contradiction_score = sum(item.similarity * item.stance_score for item in contradicts)
    model_true = sum(signal.score * signal.weight for signal in model_signals if signal.verdict == "true")
    model_false = sum(signal.score * signal.weight for signal in model_signals if signal.verdict == "false")
    model_risk = sum(signal.score * signal.weight for signal in model_signals if signal.verdict == "risk")

    if not evidence:
        if model_false > 0.45 or model_risk > 0.4:
            confidence = int(min(76, 45 + (model_false + model_risk) * 24))
            return "false", confidence, confidence, "No strong references were found, and model signals show misinformation risk."
        return "uncertain", 35, 35, "No usable Google News or Reddit references were found."

    total = support_score + contradiction_score + 0.35
    true_probability = support_score / total
    false_probability = contradiction_score / total
    ensemble_true = true_probability + model_true * 0.18
    ensemble_false = false_probability + model_false * 0.22 + model_risk * 0.1

    if support_score >= 0.45 and ensemble_true >= max(0.58, ensemble_false + 0.08):
        confidence = int(min(94, 55 + ensemble_true * 35 + len(supports) * 2))
        return "true", confidence, confidence, "The strongest references support the submitted claim."

    if contradiction_score >= 0.6 and len(contradicts) >= 2 and ensemble_false >= max(0.62, ensemble_true + 0.12):
        confidence = int(min(94, 55 + ensemble_false * 35 + len(contradicts) * 2))
        return "false", confidence, confidence, "The strongest references contradict the submitted claim."

    if model_false > 0.65 and true_probability < 0.45:
        confidence = int(min(82, 50 + model_false * 28))
        return "false", confidence, confidence, "Reference support is weak and the fake-news classifier flags the claim."

    best_similarity = max(item.similarity for item in evidence)
    confidence = int(max(42, min(70, 45 + best_similarity * 35)))
    return "uncertain", confidence, confidence, "References were found, but they do not clearly prove true or false."

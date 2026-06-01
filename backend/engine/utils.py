# Standard blending rates per 1M tokens
MODEL_PRICING = {
    "gemini-2.5-flash": {"input": 0.075 / 1_000_000, "output": 0.30 / 1_000_000},
    "gpt-4o": {"input": 2.50 / 1_000_000, "output": 10.00 / 1_000_000},
    "claude-3-5-sonnet": {"input": 3.00 / 1_000_000, "output": 15.00 / 1_000_000}
}

def calculate_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
    """Calculates exact execution cost based on model rates."""
    pricing = MODEL_PRICING.get(model_name.lower(), MODEL_PRICING["gemini-2.5-flash"])
    cost = (input_tokens * pricing["input"]) + (output_tokens * pricing["output"])
    return round(cost, 6)
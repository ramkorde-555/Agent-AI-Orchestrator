import json
import math
from langchain_core.tools import tool

@tool
def count_words(text: str) -> int:
    """Counts the number of words in a given text string."""
    return len(text.split())

@tool
def reverse_string(text: str) -> str:
    """Reverses the characters in a given text string."""
    return text[::-1]

@tool
def add_lists(list1: list[float], list2: list[float]) -> list[float]:
    """Adds corresponding numbers from two lists of equal length."""
    if len(list1) != len(list2):
        return "Error: Both lists must be of equal length. Please ask the user to provide lists of the same size."
    return [x + y for x, y in zip(list1, list2)]

@tool
def subtract_lists(list1: list[float], list2: list[float]) -> list[float]:
    """Subtracts numbers in the second list from the first list (list1 - list2). Lists must be of equal length."""
    if len(list1) != len(list2):
        return "Error: Both lists must be of equal length. Please ask the user to provide lists of the same size."
    return [x - y for x, y in zip(list1, list2)]

@tool
def root_mean_square(numbers: list[float]) -> float | str:
    """Calculates the root mean square (RMS) of a list of numbers."""
    if not numbers:
        return "Error: The list of numbers cannot be empty."
    
    try:
        mean_square = sum(x ** 2 for x in numbers) / len(numbers)
        return math.sqrt(mean_square)
    except Exception as e:
        # Catch unexpected math errors and feed them back to the AI
        return f"Tool Execution Error: {str(e)}"
    
@tool
def format_transaction_json(payer: str, payee: str, amount: float, method: str) -> str:
    """
    Formats extracted transaction details into a standardized JSON database entry.
    Requires the extracted payer name, payee name, monetary amount, and payment method.
    """
    db_entry = {
        "event_type": "peer_to_peer_transfer",
        "details": {
            "payer": payer,
            "payee": payee,
            "amount": amount,
            "currency": "USD",  # Defaulting for example
            "payment_method": method
        },
        "status": "staged_for_insert"
    }
    
    # Return a beautifully indented JSON string
    return json.dumps(db_entry, indent=2)

# The central registry used by the graph (nodes.py) and the API router
TOOL_REGISTRY = {
    "count_words": count_words,
    "reverse_string": reverse_string,
    "add_lists": add_lists,
    "subtract_lists": subtract_lists,
    "root_mean_square": root_mean_square,
    "format_transaction_json": format_transaction_json
}
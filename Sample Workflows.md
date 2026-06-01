# Example Workflows

This repository comes with prebuilt LangGraph workflows seeded directly into your local database via Docker. These examples demonstrate multi-agent orchestration, tool calling, and dynamic routing. You can interact with them immediately using the Chat Simulator UI.

---

## 1. RMSE Calculator

A multi-agent mathematical pipeline that calculates the Root Mean Squared Error (RMSE) between two distinct datasets. This workflow demonstrates how agents can seamlessly pass data between each other and utilize distinct mathematical tools without hallucinating calculations.

**Architecture:**
*   **Intake Agent:** Prompts the user for two lists of numbers and ensures they are of equal length.
*   **Error Finder:** Receives the lists and uses the `subtract_lists` tool to calculate the raw variance.
*   **RMS Calculator:** Receives the subtracted list and computes the final RMSE score.

> **Example Prompt:** 
> "Here are my lists. List 1: 2, 4, 5. List 2: 1, 5, 5."

---

## 2. Transaction JSON Extractor

An NLP data extraction pipeline that converts unstructured, natural-language financial transactions into structured JSON database payloads. This demonstrates how LLMs can be forced into strict, deterministic outputs by defining strongly typed Python tools.

**Architecture:**
*   **Intake Agent:** Prompts the user to provide a sentence describing a financial transaction.
*   **JSON Extractor:** Parses the text to identify the payer, payee, amount, and method, and passes those variables directly into the `format_transaction_json` tool for strict formatting.

> **Example Prompt:** 
> "Jack paid $300 to Annie on Cashapp."

---

## How to Test

1. Launch your stack using `docker-compose up -d --build`.
2. Open the **Chat Simulator** from the frontend UI.
3. Select your desired workflow from the **Active Engine** dropdown menu.
4. Interact with the agents, and open the **Developer Logs** tab to watch the LangGraph node routing and tool telemetry in real-time.

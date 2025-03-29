# Magnus - Personal Life Guide

Magnus is a comprehensive personal finance management application designed to help users track their investments (with specific integration for Trading 212), manage financial or life goals, organize tasks, and interact with an AI financial or life assistant.

[![Remix](https://img.shields.io/badge/Remix-v2-blueviolet.svg)](https://remix.run) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3-blue.svg)](https://tailwindcss.com/)

## Features

* **Dashboard:** Provides a quick overview of your portfolio summary, upcoming tasks, and progress towards financial goals.
* **Portfolio Tracking:**
    * Fetches and displays investment data directly from the Trading 212 API (pies, instruments, cash).
    * Enriches instrument data with details from Yahoo Finance (dividend yield, historical performance).
    * Calculates overall portfolio performance (total invested, result, return percentage).
    * Visualizes portfolio allocation (pie chart) and value trends (line chart).
    * Compares portfolio performance against user-defined benchmarks.
    * Provides detailed allocation analysis (target vs. current vs. difference).
    * Suggests rebalancing actions based on target allocations and optional new investments.
    * Includes database-backed caching for portfolio data to minimize API calls.
    * Supports importing Trading 212 pie data via CSV and exporting portfolio data as JSON.
    * Allows manual entry and editing of historical portfolio values and benchmarks.
    * Displays a sortable and filterable breakdown of instruments within each portfolio pie.
* **Goal Management:**
    * Create, track, update, and delete long-term financial goals (e.g., saving for a mortgage down payment).
    * Visualizes progress towards goals based on current portfolio value and projected growth.
    * Calculates projected outcomes based on monthly contributions and expected returns.
    * Provides milestone notifications.
* **Task Management:**
    * Create, view, update, delete, and mark tasks as complete.
    * Assign details like description, due date, category, priority, and financial amount.
    * View tasks in a filterable list (All, Today, Upcoming, Completed, Incomplete) or a calendar view.
    * Supports bulk task creation and import from JSON (with an AI helper prompt).
* **AI Financial Assistant:**
    * Chat interface to interact with a backend AI assistant for financial insights.
    * Supports streaming responses.
    * Allows model selection (if supported by backend).
    * Can display sources provided by the assistant.
* **User Settings:**
    * Manage personal preferences like country, currency (e.g., USD, EUR), monthly budget, and theme (light/dark/system).
* **Authentication:** Secure user registration and login system.

## Tech Stack

* **Framework:** Remix.run
* **Language:** TypeScript
* **Frontend:** React
* **Styling:** Tailwind CSS
* **Database:** SQLite
* **ORM:** Drizzle ORM
* **Authentication:** Remix Auth, bcryptjs
* **Data Fetching:** Axios, Yahoo-Finance2
* **Charting:** Chart.js, react-chartjs-2
* **Validation:** Zod
* **Date Handling:** date-fns
* **UI Components:** Headless UI (Tailwind), React Icons (Fi)

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-folder>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    ```
3.  **Environment Variables:**
    * Create a `.env` file in the root directory.
    * Add necessary environment variables, particularly `API_KEY` for the Trading 212 API:
        ```env
        API_KEY="YOUR_TRADING_212_API_KEY"
        # Add other variables like session secrets if needed
        SESSION_SECRET="your-super-secret-session-key"
        ```
4.  **Database Setup:** The SQLite database (`magnus.db`) will be automatically created in the `./data/` directory on the first run if it doesn't exist.
5.  **(Optional) Chat Backend:** This application interacts with a separate backend (likely FastAPI) for chat functionality. Ensure that backend server is running (typically on `http://localhost:8000` or `http://127.0.0.1:8000` based on the code).

## Running the App

1.  **Start the development server:**
    ```bash
    npm run dev
    # or yarn dev
    ```
2.  Open your browser and navigate to `http://localhost:3000` (or the specified port).

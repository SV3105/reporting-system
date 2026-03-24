# 📊 Reporting System

A comprehensive, real-time reporting and analytics dashboard built with a robust data ingestion pipeline. This system processes CSV data through Kafka, indexes it into Apache Solr for high-performance searching, and visualizes it using a modern React frontend.

---

## 🚀 Key Features

- **🏎️ Real-time Data Ingestion**: Seamlessly process large CSV datasets via Kafka.
- **🔍 Advanced Search & Filtering**: Powered by Apache Solr for lightning-fast results.
- **📈 Interactive Dashboards**: Beautifully rendered charts and data visualizations.
- **🖱️ Drill-down Analysis**: Click-through charts to view underlying data records.
- **📅 Workflow & Scheduling**: Automated report generation and email scheduling.
- **🔔 Live Updates**: Real-time notifications via WebSockets when data is indexed.
- **🔌 WebSocket Integration**: Instantly pushes data updates to the frontend.
- **📧 Email Integration**: Integrated with Mailhog for reliable email testing.

---

## 🏗️ Architecture & Workflow

The system follows a modern decoupled architecture:

1.  **Ingestion**: `producer.php` reads CSV files and publishes messages to Kafka.
2.  **Processing**: `consumer.php` listens to Kafka topics and indexes data into Apache Solr.
3.  **Storage**: Metadata and scheduled reports are stored in PostgreSQL.
4.  **Real-time**: `consumer.php` notifies a WebSocket server (`websocket.php`) upon successful indexing.
5.  **API**: A PHP-based MVC API serves as the bridge between the frontend and Solr/Postgres.
6.  **Frontend**: A high-performance React (Vite) application provides a premium user experience and listens for WebSocket events.

```
    CSV[CSV Files] --> Producer[PHP Producer]
    Producer --> Kafka[Kafka Broker]
    Kafka --> Consumer[PHP Consumer]
    Consumer --> Solr[Apache Solr]
    Consumer --> WS[WebSocket Server]
    WS --> React[React Frontend]
    Solr --> API[PHP API]
    DB[PostgreSQL] --> API
    API --> React
    API --> Mailhog[Email Service]
```

---

## 🛠️ Tech Stack

- **Backend**: PHP (Custom MVC), Composer
- **Frontend**: React, Vite, TailwindCSS (for styling), Lucide Icons
- **Messaging**: Apache Kafka, Zookeeper
- **Search Engine**: Apache Solr
- **Database**: PostgreSQL
- **DevOps**: Docker, Docker Compose
- **Testing**: Mailhog (SMTP)

---

## ⚙️ Getting Started

### Prerequisites

- Docker Desktop
- Node.js & npm (for local frontend development)

### Quick Start

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd reporting-system
    ```

2.  **Start the services**:
    ```bash
    docker-compose up -d --build
    ```

3.  **Register the Solr Core** (Done automatically by `docker-compose`):
    The `solr-precreate csvcore` command in `docker-compose.yml` initializes the search core.

4.  **Start Data Ingestion**:
    *   **Phase 1: Run the Consumer** (Keep this running to process data):
        ```bash
        docker exec -it php-api php consumer.php
        ```
    *   **Phase 2: Run the Producer** (To send CSV data to Kafka):
        Place your `.csv` files in the `php/csvfiles/` directory, then run:
        ```bash
        docker exec -it php-api php producer.php
        ```

---

### ⚖️ Scaling & Performance (Kafka)

The system is designed for high throughput. To optimize data processing, you can scale the number of consumer instances based on the Kafka partition count:

- **Current Partitions**: 4 (as defined in `docker-compose.yml`)
- **Optimal Setup**: Run up to **4 consumer instances** in parallel to maximize ingestion speed.

To run multiple consumers:
```bash
# Open multiple terminals and run in each:
docker exec -it php-api php consumer.php
```

---

## 🔗 Service URLs

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend** | [http://localhost:5173](http://localhost:5173) | Main dashboard UI |
| **API Backend** | [http://localhost:8000](http://localhost:8000) | REST API endpoints |
| **Kafka UI** | [http://localhost:8080](http://localhost:8080) | Kafka cluster monitor |
| **Solr Admin** | [http://localhost:8983](http://localhost:8983) | Solr search interface |
| **WebSocket** | `ws://localhost:8082` | Real-time event stream |
| **Mailhog** | [http://localhost:8025](http://localhost:8025) | Local email inbox |

---

## 📂 Project Structure

- `frontend/`: React source code, components, and static assets.
- `php/`: Backend API, data producers/consumers, and core logic.
- `docker-compose.yml`: Full containerized environment definition.

---



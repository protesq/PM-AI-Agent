# 🤖 PM-AI-Agent — Project Management AI Agent

Full-stack proje yönetim uygulaması. **Claude AI** agent'ı doğal dil komutlarıyla proje yönetir, Docker servislerini kontrol eder, MySQL veritabanları oluşturur ve gerçek kaynak kod yazar.

> **💡 API Key gerektirmez!** Bilgisayarınızda Claude CLI ile giriş yaptıysanız, uygulamanız doğrudan Pro/Max hesabınızı kullanır.

---

## 🚀 Hızlı Başlangıç

### Gereksinimler

- **Node.js 18+**
- **Claude CLI** — [claude.ai/download](https://claude.ai/download) adresinden kurun
- **MySQL** (Laragon, XAMPP vb.) veya `USE_SQLITE=true` ile SQLite

### 1️⃣ Claude CLI ile Giriş Yapın

```bash
# CLI'ı kurun (henüz yoksa)
npm install -g @anthropic-ai/claude-code

# Claude hesabınızla giriş yapın (Pro veya Max)
claude login
```

> Bu adım **tek seferlik**! Giriş yaptıktan sonra uygulama otomatik olarak
> bilgisayarınızdaki Claude oturumunu kullanır. Ek API key gerekmez.

### 2️⃣ Projeyi Kurun

```bash
git clone https://github.com/protesq/PM-AI-Agent.git
cd PM-AI-Agent

# .env dosyasını oluşturun (sadece DB ayarları için)
cp .env.example .env
# .env içindeki MySQL bilgilerini doldurun (ANTHROPIC_API_KEY gerekmez!)

# Bağımlılıkları kurun
npm run install:all
```

### 3️⃣ Çalıştırın

```bash
npm run dev
```

| Arabirim | URL | Açıklama |
|---|---|---|
| **Frontend UI** | http://localhost:3000 | Kullanıcı arayüzü ve AI sohbet paneli |
| **Backend API** | http://localhost:5000 | Agent karar mekanizması ve servis endpointleri |

---

## 🏗️ Sistem Mimarisi — Agent'lar Arası İlişki

PM-AI-Agent, klasik istemci-sunucu modelinin ötesine geçerek **Agent Tabanlı Mimari** kullanır.

### 🔄 Etkileşim Akışı

```
   👤 Kullanıcı
       │ prompt
       ▼
   ⚛️ Frontend (React + React Flow)
       │ HTTP POST /api/agent/request
       ▼
   🟢 Backend (Node.js/Express)
       │ subprocess: claude -p --output-format json
       ▼
   🤖 Claude Agent (CLI üzerinden)  ◄──► 🤖 Peer Agent
       │                                    (inter-agent msg)
       ├──► 🗄️ MySQL DB        (SQL / result)
       ├──► 🐳 Docker Daemon   (container yönetimi)
       └──► 📁 Dosya Sistemi   (kod yazma / terminal)
```

### Bileşenler

| Bileşen | Rol |
|---|---|
| **Frontend** | React Flow ile canlı mimari haritası, sohbet paneli |
| **Backend** | Claude CLI'ı subprocess olarak çağırır, tool sonuçlarını işler |
| **Claude Agent** | Gelen isteği anlar, 27 araçtan hangisini kullanacağına karar verir |
| **Peer Agent** | Karmaşık görevlerde ana agent ile çift yönlü haberleşir |
| **MySQL DB** | Proje/görev verileri ve agent'ın oluşturduğu veritabanları |
| **Docker** | Agent'ın oluşturduğu projelerin konteyner yönetimi |

### 🔧 Nasıl Çalışıyor? (Claude CLI Entegrasyonu)

```
1. Kullanıcı mesaj yazar
       │
2. Backend "claude -p --output-format json" subprocess çalıştırır
       │  (bilgisayarınızdaki CLI oturumunu kullanır — API key gerekmez!)
       │
3. Claude cevap verir:
   ├── Araç çağrısı varsa → Backend araçları çalıştırır → 2'ye dön
   └── Nihai cevap → Kullanıcıya döndür
```

Backend her istek için `claude -p` komutunu çağırır. CLI zaten bilgisayarınızda giriş yapılmış olduğundan **Pro/Max aboneliğinizi** kullanır. Ayrı API key'e veya kredi kartına gerek yoktur.

---

## 🐳 Docker ile Çalıştırma

```bash
npm run docker        # docker compose up --build
npm run stop          # docker compose down
npm run clean         # docker compose down -v (volume'ları da sil)
```

| Servis | URL | Açıklama |
|---|---|---|
| Frontend | http://localhost:3000 | React + React Flow UI |
| Backend API | http://localhost:5000 | Node.js/Express + Claude CLI |
| phpMyAdmin | http://localhost:8080 | MySQL admin paneli |

---

## 💬 Örnek Komutlar

### Proje Yönetimi
```
Create a project called Mobile App
Add 3 tasks to project 1: Design, Development, Testing
Mark task 1 as done
Generate a report for project 1
```

### Docker Yönetimi
```
Docker servislerinin durumunu göster
Backend servisinin loglarını göster
Frontend konteynerini yeniden başlat
```

### Full-Stack Proje Oluşturma
```
C:/Projects/TodoApp klasöründe React + Node.js + MySQL full-stack proje oluştur
todoapp veritabanı oluştur ve users + posts tablolarını ekle
```

---

## ⚙️ Ortam Değişkenleri (.env)

```env
# Claude CLI kullanıldığı için API key GEREKMİYOR!
# ANTHROPIC_API_KEY=sk-ant-...  (devre dışı)

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=aiagent_db

USE_SQLITE=false       # true → SQLite (MySQL gerekmez)
PORT=5000
```

---

## 📁 Proje Yapısı

```
PM-AI-Agent/
├── .env.example              # Örnek ortam değişkenleri
├── docker-compose.yml        # 4 servis: frontend, backend, db, phpmyadmin
├── package.json              # Root: concurrently ile npm run dev
│
├── backend/
│   ├── system-prompt.md      # Agent davranışı (UI'dan düzenlenebilir)
│   └── src/
│       ├── agent.js          # 🤖 Claude CLI subprocess + agentic tool loop
│       ├── tools.js          # PM araçları (proje, görev, rapor)
│       ├── docker-tools.js   # Docker Compose yönetimi
│       ├── fs-tools.js       # Dosya sistemi & terminal komutları
│       ├── mysql-admin-tools.js  # MySQL DB yönetimi
│       └── db.js             # MySQL/SQLite bağlantı yöneticisi
│
└── frontend/
    └── src/
        ├── App.jsx           # Ana layout, mesaj state, animasyon
        └── components/
            ├── AgentFlowCanvas.jsx   # React Flow mimari haritası
            ├── ChatPanel.jsx         # Sohbet arayüzü + ayarlar
            └── ProjectsSidebar.jsx   # Proje listesi + Docker kontrolleri
```

---

## 📋 27 Araç — Kategoriler

| Kategori | Araç Sayısı | Araçlar |
|---|---|---|
| **PM** | 6 | get_projects, create_project, get_tasks, create_task, update_task_status, generate_report |
| **Docker** | 9 | docker_status, docker_list_containers, docker_get_logs, docker_start/stop/restart_service, docker_get_stats, docker_inspect_service, docker_rebuild_service |
| **MySQL Admin** | 6 | mysql_create_database, mysql_run_sql, mysql_run_sql_batch, mysql_list_databases, mysql_list_tables, mysql_update_credentials |
| **Dosya Sistemi** | 6 | create_file, read_file, list_directory, create_directory, delete_file, run_command |

---

## 📝 Notlar

- `claude login` ile **tek seferlik** giriş yeterlidir — token ~1 yıl geçerlidir
- MySQL (Laragon vb.) çalışmıyorsa `.env`'de `USE_SQLITE=true` yapın
- `system-prompt.md` dosyasını UI'daki ⚙️ butonuyla düzenleyebilirsiniz
- Hot reload: hem frontend hem backend dosya değişikliklerinde otomatik yenilenir

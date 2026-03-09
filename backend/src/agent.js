const nodePath = require("path");
const nodeFs = require("fs");
const { exec } = require("child_process");
const tools = require("./tools");
const docker = require("./docker-tools");
const fsTools = require("./fs-tools");
const dbAdmin = require("./mysql-admin-tools");

const PROMPT_FILE = nodePath.join(__dirname, "../system-prompt.md");

function getSystemPrompt() {
  try {
    return nodeFs.readFileSync(PROMPT_FILE, "utf8");
  } catch {
    return "Sen bir full-stack proje yönetim ve geliştirme agentisin.";
  }
}

// ── Claude CLI subprocess ile mesaj gönder ──────────────────────────────────
function callClaudeCLI(prompt) {
  return new Promise((resolve, reject) => {
    const child = exec(
      'claude -p --output-format json --tools ""',
      {
        maxBuffer: 1024 * 1024 * 10, // 10MB
        timeout: 120000,             // 2 dakika
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        // Claude CLI bazen exit code 1 döner ama stdout'ta geçerli JSON olabilir
        // Önce stdout'u kontrol et
        if (stdout && stdout.trim()) {
          try {
            const result = JSON.parse(stdout);
            return resolve(result);
          } catch {
            // JSON değilse düz metin olarak döndür
            return resolve({ result: stdout.trim(), is_error: false });
          }
        }

        // stdout boşsa gerçek bir hata var
        if (error) {
          if (stderr && stderr.includes("login")) {
            return reject(new Error("Claude CLI oturumu bulunamadı! Lütfen terminalden 'claude login' yapın."));
          }
          if (stderr && stderr.includes("rate")) {
            return reject(new Error("Claude kullanım limitine ulaştınız. Lütfen biraz bekleyip tekrar deneyin."));
          }
          console.error("[CLAUDE CLI] stderr:", stderr);
        console.error("[CLAUDE CLI] error:", error.message);
        return reject(new Error(`Claude CLI hatası: ${stderr || error.message}`));
        }

        resolve({ result: "", is_error: true });
      }
    );

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

const toolDefinitions = [
  {
    name: "get_projects",
    description: "Retrieve all projects from the database.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "create_project",
    description: "Create a new project.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name" },
        description: { type: "string", description: "Project description" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_tasks",
    description: "Get all tasks for a specific project.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "number", description: "The project ID" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "create_task",
    description: "Create a new task for a project.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "number", description: "The project ID" },
        title: { type: "string", description: "Task title" },
        assigned_to: { type: "string", description: "Person the task is assigned to" },
      },
      required: ["project_id", "title"],
    },
  },
  {
    name: "update_task_status",
    description: "Update the status of a task. Valid statuses: todo, in_progress, done.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "number", description: "The task ID" },
        status: { type: "string", enum: ["todo", "in_progress", "done"], description: "New status" },
      },
      required: ["task_id", "status"],
    },
  },
  {
    name: "generate_report",
    description: "Generate and save a summary report for a project.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "number", description: "The project ID" },
      },
      required: ["project_id"],
    },
  },

  // ── Docker araçları ────────────────────────────────────────────────────────
  {
    name: "docker_status",
    description: "Show the status of all Docker Compose services.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "docker_list_containers",
    description: "List all Docker containers with status, image and ports.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "docker_get_logs",
    description: "Fetch the latest logs from a Docker Compose service.",
    input_schema: {
      type: "object",
      properties: {
        service_name: { type: "string", enum: ["frontend", "backend", "db", "phpmyadmin"], description: "Service name" },
        lines: { type: "number", description: "Number of log lines (default 80)" },
      },
      required: ["service_name"],
    },
  },
  {
    name: "docker_start_service",
    description: "Start a stopped Docker Compose service.",
    input_schema: {
      type: "object",
      properties: {
        service_name: { type: "string", enum: ["frontend", "backend", "db", "phpmyadmin"] },
      },
      required: ["service_name"],
    },
  },
  {
    name: "docker_stop_service",
    description: "Stop a running Docker Compose service.",
    input_schema: {
      type: "object",
      properties: {
        service_name: { type: "string", enum: ["frontend", "backend", "db", "phpmyadmin"] },
      },
      required: ["service_name"],
    },
  },
  {
    name: "docker_restart_service",
    description: "Restart a Docker Compose service.",
    input_schema: {
      type: "object",
      properties: {
        service_name: { type: "string", enum: ["frontend", "backend", "db", "phpmyadmin"] },
      },
      required: ["service_name"],
    },
  },
  {
    name: "docker_get_stats",
    description: "Get CPU, memory, network usage for all project containers.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "docker_inspect_service",
    description: "Get detailed information about a Docker Compose service.",
    input_schema: {
      type: "object",
      properties: {
        service_name: { type: "string", enum: ["frontend", "backend", "db", "phpmyadmin"] },
      },
      required: ["service_name"],
    },
  },
  {
    name: "docker_rebuild_service",
    description: "Rebuild and restart a Docker Compose service (docker compose up -d --build).",
    input_schema: {
      type: "object",
      properties: {
        service_name: { type: "string", enum: ["frontend", "backend", "db", "phpmyadmin"] },
      },
      required: ["service_name"],
    },
  },

  // ── MySQL Admin araçları ───────────────────────────────────────────────────
  {
    name: "mysql_create_database",
    description: "Create a new MySQL database (CREATE DATABASE IF NOT EXISTS).",
    input_schema: {
      type: "object",
      properties: {
        db_name: { type: "string", description: "Database name (letters, numbers, underscores only)" },
      },
      required: ["db_name"],
    },
  },
  {
    name: "mysql_run_sql",
    description: "Execute a single SQL statement in a MySQL database.",
    input_schema: {
      type: "object",
      properties: {
        database: { type: "string", description: "Target database name" },
        sql: { type: "string", description: "SQL statement to execute" },
      },
      required: ["database", "sql"],
    },
  },
  {
    name: "mysql_run_sql_batch",
    description: "Execute multiple SQL statements at once. Separate statements with semicolons.",
    input_schema: {
      type: "object",
      properties: {
        database: { type: "string", description: "Target database name" },
        sql_batch: { type: "string", description: "Multiple SQL statements separated by semicolons" },
      },
      required: ["database", "sql_batch"],
    },
  },
  {
    name: "mysql_list_databases",
    description: "List all MySQL databases on the server.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "mysql_list_tables",
    description: "List all tables in a specific MySQL database.",
    input_schema: {
      type: "object",
      properties: {
        database: { type: "string", description: "Database name" },
      },
      required: ["database"],
    },
  },
  {
    name: "mysql_update_credentials",
    description: "Update MySQL connection credentials in the .env file.",
    input_schema: {
      type: "object",
      properties: {
        host: { type: "string" }, port: { type: "number" },
        user: { type: "string" }, password: { type: "string" },
        database: { type: "string" },
      },
      required: [],
    },
  },

  // ── Dosya sistemi & kod yazma araçları ─────────────────────────────────────
  {
    name: "create_file",
    description: "Create or overwrite a file with given content.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute file path" },
        content: { type: "string", description: "Full file content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "read_file",
    description: "Read the content of an existing file.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "list_directory",
    description: "List all files and subdirectories in a given folder.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "create_directory",
    description: "Create a directory (and all parent directories).",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file or directory (recursive).",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "run_command",
    description: "Run a terminal command. Allowed: npm, npx, node, git, docker, python, pip, yarn, pnpm, mkdir, echo.",
    input_schema: {
      type: "object",
      properties: {
        work_dir: { type: "string", description: "Working directory (absolute path)" },
        command: { type: "string", description: "Command to execute" },
      },
      required: ["command"],
    },
  },
];

async function executeTool(name, input) {
  console.log(`[AGENT] TOOL CALLED: ${name}`, JSON.stringify(input));
  let result;
  try {
    switch (name) {
      case "get_projects": result = await tools.getProjects(); break;
      case "create_project": result = await tools.createProject(input.name, input.description); break;
      case "get_tasks": result = await tools.getTasks(input.project_id); break;
      case "create_task": result = await tools.createTask(input.project_id, input.title, input.assigned_to); break;
      case "update_task_status": result = await tools.updateTaskStatus(input.task_id, input.status); break;
      case "generate_report": result = await tools.generateReport(input.project_id); break;
      case "docker_status": result = await docker.getComposeStatus(); break;
      case "docker_list_containers": result = await docker.listContainers(); break;
      case "docker_get_logs": result = await docker.getServiceLogs(input.service_name, input.lines); break;
      case "docker_start_service": result = await docker.startService(input.service_name); break;
      case "docker_stop_service": result = await docker.stopService(input.service_name); break;
      case "docker_restart_service": result = await docker.restartService(input.service_name); break;
      case "docker_get_stats": result = await docker.getStats(); break;
      case "docker_inspect_service": result = await docker.inspectService(input.service_name); break;
      case "docker_rebuild_service": result = await docker.rebuildService(input.service_name); break;
      case "mysql_create_database": result = await dbAdmin.createDatabase(input.db_name); break;
      case "mysql_run_sql": result = await dbAdmin.runSQL(input.database, input.sql); break;
      case "mysql_run_sql_batch": result = await dbAdmin.runSQLBatch(input.database, input.sql_batch); break;
      case "mysql_list_databases": result = await dbAdmin.listDatabases(); break;
      case "mysql_list_tables": result = await dbAdmin.listTables(input.database); break;
      case "mysql_update_credentials": result = await dbAdmin.updateMysqlCredentials(input); break;
      case "create_file": result = await fsTools.createFile(input.path, input.content); break;
      case "read_file": result = await fsTools.readFile(input.path); break;
      case "list_directory": result = await fsTools.listDirectory(input.path); break;
      case "create_directory": result = await fsTools.createDirectory(input.path); break;
      case "delete_file": result = await fsTools.deleteFile(input.path); break;
      case "run_command": result = await fsTools.runCommand(input.work_dir, input.command); break;
      default:
        result = { success: false, data: null, error: `Unknown tool: ${name}`, timestamp: new Date().toISOString() };
    }
  } catch (err) {
    result = { success: false, data: null, error: err.message, timestamp: new Date().toISOString() };
  }

  if (result.success) {
    console.log(`[AGENT] TOOL SUCCESS: ${name}`);
  } else {
    console.error(`[AGENT] TOOL FAILED: ${name} — ${result.error}`);
  }
  return result;
}

// ── Tool açıklamalarını prompt'a göm (compact) ────────────────────────────────
function buildToolDescriptions() {
  return toolDefinitions.map(t => {
    const req = t.input_schema.required?.length ? `(${t.input_schema.required.join(", ")})` : "()";
    return `- ${t.name}${req}: ${t.description}`;
  }).join("\n");
}

// ── Tool çağrısı parse et ────────────────────────────────────────────────────
function parseToolCalls(text) {
  const calls = [];

  // 1) <tool_call>{"name":"...", "input":{...}}</tool_call>
  const regex = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[1]);
      if (obj.name) calls.push({ name: obj.name, input: obj.input || obj.arguments || obj.parameters || {} });
    } catch { }
  }

  // 2) ```json code block içinde tool çağrısı
  if (calls.length === 0) {
    const jsonRegex = /```json\s*\n?\s*(\{[\s\S]*?\})\s*\n?\s*```/g;
    while ((match = jsonRegex.exec(text)) !== null) {
      try {
        const obj = JSON.parse(match[1]);
        if (obj.name && (obj.input || obj.arguments || obj.parameters)) {
          calls.push({ name: obj.name, input: obj.input || obj.arguments || obj.parameters || {} });
        }
      } catch { }
    }
  }

  return calls;
}

// ── Önceki chat geçmişini formatla ───────────────────────────────────────────
function buildChatHistory(history) {
  if (!history || history.length === 0) return "";
  // Son 8 mesajı al (4 tur)
  const recent = history.slice(-8);
  const lines = recent
    .filter(m => m.text && !m.loading)
    .map(m => `${m.role === "user" ? "Kullanıcı" : "Agent"}: ${m.text.substring(0, 500)}`);
  if (lines.length === 0) return "";
  return `## ÖNCEKİ KONUŞMA GEÇMİŞİ\n${lines.join("\n")}\n\n`;
}

// ── Ana Agent Döngüsü (Claude CLI subprocess) ───────────────────────────────
async function runAgentLoop(userMessage, chatHistory = []) {
  const steps = [];
  const addStep = (step, status, detail = null) => {
    const entry = { step, status, timestamp: new Date().toISOString() };
    if (detail) entry.detail = detail;
    steps.push(entry);
    console.log(`[AGENT STEP] ${step}: ${status}${detail ? " — " + detail : ""}`);
  };

  addStep("agent_called", "success");

  const systemPrompt = getSystemPrompt();
  const toolDesc = buildToolDescriptions();
  const priorChatSection = buildChatHistory(chatHistory);
  let conversationHistory = "";
  let finalText = "";
  let reportCreated = null;
  let iteration = 0;
  const MAX_ITERATIONS = 15;

  try {
    while (iteration < MAX_ITERATIONS) {
      iteration++;

      let fullPrompt = `## SİSTEM TALİMATI\n${systemPrompt}\n\n`;
      fullPrompt += `## ARAÇLAR\nAraç çağırmak için: <tool_call>{"name": "araç_adı", "input": {...}}</tool_call>\n${toolDesc}\n\n`;

      if (priorChatSection) {
        fullPrompt += priorChatSection;
      }

      if (conversationHistory) {
        fullPrompt += `## BU İSTEKTEKİ ÖNCEKİ ADIMLAR\n${conversationHistory}\n\n`;
      }

      fullPrompt += `## KULLANICI İSTEĞİ\n${userMessage}`;

      console.log(`[AGENT] Claude CLI çağrılıyor (iterasyon ${iteration})...`);

      const cliResponse = await callClaudeCLI(fullPrompt);

      // CLI'dan gelen cevabı al
      let responseText = "";
      if (typeof cliResponse === "string") {
        responseText = cliResponse;
      } else if (cliResponse.result) {
        responseText = cliResponse.result;
      } else if (cliResponse.content) {
        if (Array.isArray(cliResponse.content)) {
          responseText = cliResponse.content.map(b => b.text || "").join("\n");
        } else {
          responseText = String(cliResponse.content);
        }
      } else {
        responseText = JSON.stringify(cliResponse);
      }

      console.log(`[AGENT] CLI cevap uzunluğu: ${responseText.length} karakter`);

      // Tool çağrısı var mı kontrol et
      const toolCalls = parseToolCalls(responseText);

      if (toolCalls.length === 0) {
        finalText = responseText.replace(/<\/?tool_call>/g, "").trim();
        addStep("response_generated", "success");
        break;
      }

      // Tool çağrılarını çalıştır
      const toolResultsForHistory = [];
      for (const call of toolCalls) {
        const input = call.input || {};
        const result = await executeTool(call.name, input);

        const isDocker = call.name.startsWith("docker_");
        const isFs = ["create_file", "read_file", "list_directory", "create_directory", "delete_file", "run_command"].includes(call.name);
        const isMysql = call.name.startsWith("mysql_");
        const stepName = isDocker ? "docker_exec"
          : isFs ? "fs_exec"
            : isMysql ? "mysql_exec"
              : "tool_executed";
        addStep(stepName, result.success ? "success" : "error",
          `${call.name}: ${result.success ? "ok" : result.error}`);

        if (!isDocker && !isFs && !isMysql) {
          addStep("db_queried", result.success ? "success" : "error");
        }

        if (call.name === "generate_report" && result.success) {
          reportCreated = result.data;
          addStep("report_created", "success");
        }

        let resultString = JSON.stringify(result);
        if (resultString.length > 2000) {
          resultString = resultString.substring(0, 2000) + "... [TRUNCATED]";
        }

        toolResultsForHistory.push(`${call.name}: ${resultString}`);
      }

      // Konuşma geçmişini güncelle — sadece son 2 iterasyonu tut
      const newEntry = `[iter${iteration}] ${toolResultsForHistory.join(" | ")}\n`;
      const historyLines = (conversationHistory + newEntry).split("\n");
      if (historyLines.length > 40) {
        conversationHistory = historyLines.slice(-40).join("\n");
      } else {
        conversationHistory += newEntry;
      }
      conversationHistory += `Devam et. Başka araç gerekmiyorsa nihai cevabı ver.\n`;
    }

    if (iteration >= MAX_ITERATIONS && !finalText) {
      finalText = "Agent maksimum iterasyona ulaştı. Lütfen daha spesifik bir istek deneyin.";
      addStep("max_iterations", "error", `${MAX_ITERATIONS} iterasyona ulaşıldı`);
    }

  } catch (err) {
    addStep("agent_error", "error", err.message);
    finalText = `Agent error: ${err.message}`;
  }

  return { response: finalText, report: reportCreated, steps };
}

module.exports = { runAgentLoop };

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function emit({ api = "APP", status = "INFO", message, requestId = null }) {
  const prefix = `[${formatTimestamp()}] [${api}] [${status}]`;
  const trace = requestId ? ` [${requestId}]` : "";
  console.log(`${prefix}${trace} ${message}`);
}

function logApiStep({ api, status, message, requestId }) {
  emit({ api, status, message, requestId });
}

function logRequestSummary({ requestId, method, url, statusCode, durationMs }) {
  emit({
    api: "HTTP_REQUEST",
    status: "SUCCESS",
    requestId,
    message: `${method} ${url} ${statusCode} in ${durationMs}ms`,
  });
}

function logError({ api, message, error, requestId }) {
  emit({
    api,
    status: "ERROR",
    requestId,
    message: `${message}${error ? `: ${error.message}` : ""}`,
  });
}

module.exports = {
  logApiStep,
  logError,
  logRequestSummary,
};

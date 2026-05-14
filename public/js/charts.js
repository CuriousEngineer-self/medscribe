// ============ TREND CHARTS ============

async function loadTrendChart() {
  const sel = document.getElementById("trend-param-select");
  if (!sel || !sel.value) return;

  const paramId = sel.value;
  const schema = AppState.schemas.find((s) => s.id == paramId);
  if (!schema) return;

  try {
    const data = await API.get(
      `/api/visits/trends/${AppState.currentPatientId}?parameter_id=${paramId}`,
    );

    const canvas = document.getElementById("trend-chart");
    if (!canvas) return;

    // Destroy existing chart
    if (AppState.trendChart) {
      AppState.trendChart.destroy();
      AppState.trendChart = null;
    }

    if (!data.length) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.parentElement.innerHTML =
        '<canvas id="trend-chart"></canvas><div class="empty-state" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)"><p>No data recorded for this parameter yet.</p></div>';
      return;
    }

    const labels = data.map((d) => formatDate(d.visit_date));
    const values = data.map((d) => d.numeric_value);
    const minVal = schema.min_value;
    const maxVal = schema.max_value;

    AppState.trendChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: `${schema.name}${schema.unit ? " (" + schema.unit + ")" : ""}`,
            data: values,
            borderColor: "#0d6e6e",
            backgroundColor: "rgba(13,110,110,0.08)",
            pointBackgroundColor: values.map((v) => {
              if (minVal !== null && maxVal !== null) {
                if (v < minVal || v > maxVal) return "#c0392b";
              }
              return "#0d6e6e";
            }),
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { font: { family: "DM Sans" } } },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${ctx.parsed.y}${schema.unit ? " " + schema.unit : ""}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { font: { family: "DM Sans", size: 11 } },
          },
          y: {
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: {
              font: { family: "DM Sans", size: 11 },
              callback: (val) =>
                `${val}${schema.unit ? " " + schema.unit : ""}`,
            },
            ...(minVal !== null && maxVal !== null
              ? {
                  suggestedMin: Math.min(
                    minVal * 0.9,
                    Math.min(...values.filter((v) => v !== null)),
                  ),
                  suggestedMax: Math.max(
                    maxVal * 1.1,
                    Math.max(...values.filter((v) => v !== null)),
                  ),
                }
              : {}),
          },
        },
      },
    });
  } catch (e) {
    console.error("Chart error:", e);
  }
}

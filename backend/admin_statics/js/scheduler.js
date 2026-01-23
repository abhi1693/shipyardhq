$(function () {
  var runSelectedButton = $("#scheduler-run-selected");
  var runAllButton = $("#scheduler-run-all");
  var clearButton = $("#scheduler-clear");
  var jobInputs = $(".scheduler-job");
  var requestPending = false;

  function setDisabled(disabled) {
    runSelectedButton.prop("disabled", disabled);
    runAllButton.prop("disabled", disabled);
    clearButton.prop("disabled", disabled);
    jobInputs.prop("disabled", disabled);
  }

  function collectJobs() {
    return jobInputs
      .filter(":checked")
      .map(function () {
        return $(this).data("job");
      })
      .get()
      .filter(Boolean);
  }

  function postJobs(payload, confirmMessage) {
    if (typeof schedulerRunUrl !== "string" || schedulerRunUrl.length === 0) {
      dangerAlert("Scheduler endpoint is not available.");
      return;
    }
    if (requestPending) {
      return;
    }
    if (confirmMessage && !confirm(confirmMessage)) {
      return;
    }
    requestPending = true;
    setDisabled(true);
    fetch(schedulerRunUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(payload || {}),
    })
      .then(async (response) => {
        let payload = null;
        try {
          payload = await response.json();
        } catch (e) {}
        if (!response.ok) {
          const message =
            payload?.error?.message || payload?.message || "Request failed.";
          throw new Error(message);
        }
        return payload;
      })
      .then((payload) => {
        const message =
          payload?.message ||
          (Array.isArray(payload?.scheduled)
            ? `Scheduled jobs: ${payload.scheduled.join(", ")}`
            : "Scheduled jobs triggered.");
        successAlert(message);
      })
      .catch((error) => {
        dangerAlert(error?.message || "Failed to trigger scheduled jobs.");
      })
      .finally(() => {
        requestPending = false;
        setDisabled(false);
      });
  }

  runSelectedButton.on("click", function () {
    var jobs = collectJobs();
    if (!jobs.length) {
      dangerAlert("Select at least one job to run.");
      return;
    }
    postJobs({ jobs: jobs }, "Run selected jobs now?");
  });

  runAllButton.on("click", function () {
    postJobs({ jobs: "all" }, "Run all scheduled jobs now?");
  });

  clearButton.on("click", function () {
    jobInputs.prop("checked", false);
  });
});

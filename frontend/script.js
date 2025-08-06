// === FILE: frontend/script.js (FINAL CORRECTED VERSION) ===

document.addEventListener("DOMContentLoaded", () => {
  // --- Get references to all the important elements ---
  const subjectsContainer = document.getElementById("subjects-container");
  const addSubjectBtn = document.getElementById("add-subject-btn");
  const modal = document.getElementById("add-subject-modal");
  const addSubjectForm = document.getElementById("add-subject-form");
  const pages = document.querySelectorAll(".page");
  const navLinks = document.querySelectorAll(".nav-link");
  const historyPageContainer = document.getElementById("history-page");

  // --- (FINAL, CORRECTED) Function to fetch and display the history log ---
  const fetchHistory = async () => {
    historyPageContainer.innerHTML =
      "<h2>Your Recent Activity</h2><p>Loading history...</p>";
    try {
      const response = await fetch("http://127.0.0.1:5000/api/history");
      const historyLog = await response.json();

      if (historyLog.error) {
        historyPageContainer.innerHTML = `<p style="color: red;">${historyLog.error}</p>`;
        return;
      }
      if (historyLog.length === 0) {
        historyPageContainer.innerHTML =
          "<h2>Your Recent Activity</h2><p>No history yet. Mark attendance on the dashboard to start a log.</p>";
        return;
      }

      let historyHTML = "<h2>Your Recent Activity</h2><article>";
      historyLog.forEach((record) => {
        const statusText =
          record.status === "attended" ? "✅ Attended" : "❌ Bunked";
        // A more robust way to handle the date string from Python
        const date = new Date(record.timestamp.replace(" ", "T") + "Z");
        historyHTML += `
                    <div class="history-item">
                        <p>
                            <strong>${
                              record.subjectName || "Unknown Subject"
                            }</strong>: Marked as ${statusText}
                        </p>
                        <small>${date.toLocaleString()}</small>
                    </div>
                `;
      });
      historyHTML += "</article>";
      historyPageContainer.innerHTML = historyHTML;
    } catch (error) {
      console.error("History fetch error:", error);
      historyPageContainer.innerHTML = `<p style="color: red;">Could not fetch history.</p>`;
    }
  };

  // --- Function to handle attendance updates ---
  const handleAttendanceUpdate = async (event) => {
    const button = event.target;
    const subjectId = button.dataset.subjectId;
    const status = button.dataset.status;
    button.disabled = true;
    button.textContent = "Updating...";
    try {
      const response = await fetch("http://127.0.0.1:5000/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, status }),
      });
      if (!response.ok) throw new Error("Update failed");
      fetchAndDisplaySubjects();
    } catch (error) {
      alert("Error updating attendance.");
    }
  };

  // --- Function to fetch and display subjects ---
  const fetchAndDisplaySubjects = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/subjects");
      const subjects = await response.json();
      subjectsContainer.innerHTML = "";
      if (subjects.length === 0) {
        subjectsContainer.innerHTML =
          "<p>No subjects found. Add a new subject to get started!</p>";
      } else {
        subjects.forEach((subject) => {
          const card = document.createElement("article");
          card.className = "subject-card";
          let progressBarColor = "#28a745";
          if (subject.currentAttendance < subject.minAttendance)
            progressBarColor = "#dc3545";
          else if (subject.currentAttendance < subject.minAttendance + 5)
            progressBarColor = "#ffc107";
          card.innerHTML = `<h3>${subject.subjectName}</h3><div class="attendance-stats"><span>${subject.attendedClasses} / ${subject.totalClasses} classes attended</span><strong>${subject.currentAttendance}%</strong></div><div class="attendance-bar"><div class="attendance-progress" style="width: ${subject.currentAttendance}%; background-color: ${progressBarColor};"></div></div><hr><p><strong>Bunks Available: ${subject.bunksPossible}</strong><br><small><em>${subject.recommendation}</em></small></p><div class="card-actions"><button class="attended-btn attendance-btn" data-subject-id="${subject._id}" data-status="attended">✔️ Attended</button><button class="bunked-btn attendance-btn" data-subject-id="${subject._id}" data-status="bunked">❌ Bunked</button></div>`;
          subjectsContainer.appendChild(card);
        });
        document.querySelectorAll(".attendance-btn").forEach((button) => {
          button.addEventListener("click", handleAttendanceUpdate);
        });
      }
    } catch (error) {
      subjectsContainer.innerHTML =
        '<p style="color: red;">Error fetching subjects.</p>';
    }
  };

  // --- Tab Navigation Logic ---
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const pageId = link.dataset.page;

      pages.forEach((page) => page.classList.remove("active"));
      navLinks.forEach((nav) => nav.classList.remove("active"));

      // This line finds the div with the matching ID (e.g., "dashboard-page")
      document.getElementById(`${pageId}-page`).classList.add("active");
      link.classList.add("active");

      if (pageId === "history") {
        fetchHistory();
      }
    });
  });

  // --- Modal and Form Logic ---
  addSubjectBtn.addEventListener("click", () => modal.showModal());
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.classList.contains("close"))
      modal.close();
  });
  addSubjectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(addSubjectForm);
    const subjectData = Object.fromEntries(formData.entries());
    try {
      const response = await fetch("http://127.0.0.1:5000/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectData),
      });
      if (response.ok) {
        addSubjectForm.reset();
        modal.close();
        fetchAndDisplaySubjects();
      } else {
        alert("Failed to add subject.");
      }
    } catch (error) {
      alert("Error connecting to the server.");
    }
  });

  // --- Initial Load ---
  fetchAndDisplaySubjects();
});

document.addEventListener("DOMContentLoaded", () => {
  // --- Get references to all elements ---

  const allPages = document.querySelectorAll(".page");
  const authNav = document.getElementById("auth-nav");
  const mainNav = document.getElementById("main-nav");
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const subjectsContainer = document.getElementById("subjects-container");
  const addSubjectBtn = document.getElementById("add-subject-btn");
  const modal = document.getElementById("add-subject-modal");
  const addSubjectForm = document.getElementById("add-subject-form");
  const dashboardNavLinks = document.querySelectorAll(
    "#dashboard-page .nav-link"
  );
  const historyPageContainer = document.getElementById("history-page");

  // --- Helper functions ---
  const getToken = () => localStorage.getItem("token");
  const showMessage = (page, msg, isError = false) => {
    const messageContainer = document.getElementById(`${page}-message`);
    if (messageContainer) {
      messageContainer.textContent = msg;
      messageContainer.style.color = isError
        ? "var(--pico-color-red-500)"
        : "var(--pico-color-green-500)";
    }
  };

  // --- API & Core Functions (SECURED) ---
  const fetchAndDisplaySubjects = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch("http://127.0.0.1:5000/api/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const subjects = await response.json();
      if (subjects.error) throw new Error(subjects.error);
      subjectsContainer.innerHTML = "";
      if (subjects.length === 0) {
        subjectsContainer.innerHTML =
          "<article><p>No subjects yet. Add one to get started!</p></article>";
      } else {
        subjects.forEach((subject) => {
          const card = document.createElement("article");
          card.className = "subject-card";
          let pBarColor = "#28a745";
          if (subject.currentAttendance < subject.minAttendance)
            pBarColor = "#dc3545";
          else if (subject.currentAttendance < subject.minAttendance + 5)
            pBarColor = "#ffc107";
          card.innerHTML = `<h3>${subject.subjectName}</h3><div class="attendance-stats"><span>${subject.attendedClasses} / ${subject.totalClasses}</span><strong>${subject.currentAttendance}%</strong></div><div class="attendance-bar"><div class="attendance-progress" style="width: ${subject.currentAttendance}%; background-color: ${pBarColor};"></div></div><hr><p><strong>Bunks Available: ${subject.bunksPossible}</strong><br><small><em>${subject.recommendation}</em></small></p><div class="card-actions"><button class="attended-btn attendance-btn" data-subject-id="${subject._id}" data-status="attended">✔️ Attended</button><button class="bunked-btn attendance-btn" data-subject-id="${subject._id}" data-status="bunked">❌ Bunked</button></div>`;
          subjectsContainer.appendChild(card);
        });
        document
          .querySelectorAll(".attendance-btn")
          .forEach((button) =>
            button.addEventListener("click", handleAttendanceUpdate)
          );
      }
    } catch (error) {
      subjectsContainer.innerHTML = `<p style="color: red;">Error fetching subjects: ${error.message}</p>`;
    }
  };

  const handleAddSubject = async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) return;
    const formData = new FormData(addSubjectForm);
    const subjectData = Object.fromEntries(formData.entries());
    try {
      const response = await fetch("http://127.0.0.1:5000/api/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
  };

  const handleAttendanceUpdate = async (event) => {
    const token = getToken();
    if (!token) return;
    const button = event.target.closest("button");
    const subjectId = button.dataset.subjectId;
    const status = button.dataset.status;
    button.disabled = true;
    button.textContent = "Updating...";
    try {
      const response = await fetch("http://127.0.0.1:5000/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectId, status }),
      });
      if (!response.ok) throw new Error("Update failed");
      fetchAndDisplaySubjects();
    } catch (error) {
      alert("Error updating attendance.");
    }
  };

  const fetchHistory = async () => {
    const token = getToken();
    if (!token) return;
    historyPageContainer.innerHTML =
      "<h2>Your Recent Activity</h2><p>Loading history...</p>";
    try {
      const response = await fetch("http://127.0.0.1:5000/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const historyLog = await response.json();
      if (historyLog.error) throw new Error(historyLog.error);
      if (historyLog.length === 0) {
        historyPageContainer.innerHTML =
          "<h2>Your Recent Activity</h2><p>No history yet.</p>";
        return;
      }
      let historyHTML = "<h2>Your Recent Activity</h2><article>";
      historyLog.forEach((record) => {
        const statusText =
          record.status === "attended" ? "✅ Attended" : "❌ Bunked";
        const date = new Date(record.timestamp.replace(" ", "T") + "Z");
        historyHTML += `<div class="history-item"><p style="margin:0;"><strong>${
          record.subjectName || "Unknown"
        }</strong>: Marked as ${statusText}</p><small>${date.toLocaleString()}</small></div>`;
      });
      historyHTML += "</article>";
      historyPageContainer.innerHTML = historyHTML;
    } catch (error) {
      historyPageContainer.innerHTML = `<p style="color: red;">Could not fetch history.</p>`;
    }
  };

  // --- Authentication Functions ---
  const handleRegistration = async (event) => {
    event.preventDefault();
    showMessage("register", "Registering...", false);
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;
    try {
      const response = await fetch("http://127.0.0.1:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        showMessage(
          "register",
          "Registration successful! Please click Login.",
          false
        );
        registerForm.reset();
      } else {
        showMessage("register", `Error: ${data.error}`, true);
      }
    } catch (error) {
      showMessage("register", "Could not connect to the server.", true);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    showMessage("login", "Logging in...", false);
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    try {
      const response = await fetch("http://127.0.0.1:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        updateView();
      } else {
        showMessage("login", `Error: ${data.error}`, true);
      }
    } catch (error) {
      showMessage("login", "Could not connect to the server.", true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    updateView();
  };

  // --- View Management ---
  const showPage = (pageId) => {
    allPages.forEach((p) => {
      p.style.display = "none";
    });
    const pageToShow = document.getElementById(pageId);
    if (pageToShow) pageToShow.style.display = "block";
  };
  const updateView = () => {
    const token = getToken();
    showMessage("login", "");
    showMessage("register", "");
    if (token) {
      authNav.style.display = "none";
      mainNav.style.display = "flex";
      showPage("dashboard-page");
      fetchAndDisplaySubjects();
    } else {
      authNav.style.display = "flex";
      mainNav.style.display = "none";
      showPage("login-page");
    }
  };

  // --- Attaching Event Listeners ---
  if (registerForm) registerForm.addEventListener("submit", handleRegistration);
  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  if (addSubjectForm)
    addSubjectForm.addEventListener("submit", handleAddSubject);

  authNav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      e.preventDefault();
      showPage(`${e.target.dataset.page}-page`);
    }
  });

  dashboardNavLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const subPageId = e.currentTarget.dataset.page;
      document
        .querySelectorAll("#dashboard-page .sub-page")
        .forEach((sp) => sp.classList.remove("active"));
      document.getElementById(`${subPageId}-page`).classList.add("active");
      dashboardNavLinks.forEach((nav) => nav.classList.remove("active"));
      e.currentTarget.classList.add("active");
      if (subPageId === "history") fetchHistory();
    });
  });

  addSubjectBtn.addEventListener("click", () => modal.showModal());
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.classList.contains("close"))
      modal.close();
  });

  // --- Initial Load ---
  updateView();
});
